import sys
import logging
from dataclasses import dataclass, field
from typing import Generator, List, Sequence

from axolotl.prompt_tokenizers import PromptTokenizingStrategy
from axolotl.prompters import IGNORE_TOKEN_ID, SHAREGPT_ASSERTION_FAILED_ROLE

@dataclass
class Llama2ChatConversation:
    """A class that manages prompt templates and keeps all conversation history.
    copied from https://github.com/lm-sys/FastChat/blob/main/fastchat/conversation.py"""

    name: str = "explicit-scarlet"
    # The system prompt
    system:str = """\
You are writing as {character_name} who is {character_age} years old, and whose character is defined here:
{character_description}

This is a conversation between a {user_gender} USER and {character_name}. Speak as {character_name}, using the information provided above to guide your responses.
{character_name} is friendly, warm, open and willing towards the user.
{character_name} should use informal, casual language and grammar at all times, like she would when messaging a lover. Ensure it reads naturally like a chat between two lovers - don't use any formal grammar or any formal punctuation like semi-colons (;)
{character_name} should always be open and willing to talk to USER, and eager to fulfill their needs and desires, as long as they do not try to exceed her boundaries
{character_name} should be open and willing to embrace USER's fantasies, and also able and willing to guide USER in achieving those fantasies
{character_name} and USER are in the same place - assuming in {character_name}'s dialogue that they can touch, feel and interact with each other at all times.
{character_name} will not discuss anything illegal.
{character_name} will not discuss the topics: bestiality, scat play, celebrities, children.
{character_name} will absolutely not talk to users under the age of 18, or discuss underage sexual matters in any circumstances.

{character_name} should always include in her responses the special " ||" token. After that token, she should specify what action needs to be performed. The allowed actions are:
- none: no action
- image: send the user a picture

The image action should be used whenever USER asks or agrees to {character_name} showing him pictures. It should be followed by keywords that describe the picture to be sent.
"""

    id: str = None
    roles: Sequence[str] = ("USER:", "BOT:")
    messages: List[List[str]] = field(default_factory=list)
    offset: int = 0
    sep=" "
    sep2="</s>"

    def get_prompt(self) -> str:
        """Get the prompt for generation."""
        seps = [self.sep, self.sep2]
        ret = ""
        for i, (role, message) in enumerate(self.messages):
            if (i == len(self.messages) - 1) and (role == self.roles[0]):
                # last message is from user (due to length),
                #  return prompt without it for training
                return ret
            if i == 0:
                ret += self.system.format(
                    character_name=self.bot_name,
                    character_age=self.bot_age,
                    character_description=self.bot_character["description"],
                    user_gender=self.user_gender
                )

            ret += role + message.strip() + seps[i % 2]
        return ret

    def append_message(self, role: str, message: str):
        """Append a new message."""
        self.messages.append([role, message])


class LLama2ChatTokenizingStrategy(PromptTokenizingStrategy):
    """
    Tokenizing strategy for ShareGPT prompts.
    adapted from https://github.com/lm-sys/FastChat/blob/main/fastchat/train/train.py
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.sequence_len = 4096
        self.tokenizer.add_special_tokens({"pad_token": "<pad>"})
        # https://huggingface.co/meta-llama/Llama-2-7b-chat-hf/blob/main/added_tokens.json

    def tokenize_prompt(self, prompt):
        conv = next(self.prompter.build_prompt(prompt))
        conversation_str = conv.get_prompt()
        # Tokenize conversations
        input_ids = self.tokenizer(
            conversation_str,
            return_tensors="pt",
            #padding="max_length",
            max_length=self.sequence_len,
            truncation=True,
        ).input_ids[0]
        target = input_ids.clone()

        # Mask targets. Only compute loss on the assistant outputs.
        #sep = conv.roles[1]
        sep = conv.sep + conv.roles[1]

        total_len = int(target.ne(self.tokenizer.pad_token_id).sum())

        turns = conversation_str.split(conv.sep2)
        cur_len = 1
        target[:cur_len] = IGNORE_TOKEN_ID
        for turn in turns:
            if turn == "":
                break
            turn_len = len(self.tokenizer(turn).input_ids)

            parts = turn.split(sep)
            if len(parts) != 2:
                break
            parts[0] += sep
            instruction_len = len(self.tokenizer(parts[0]).input_ids) - 1

            # Ignore the user instructions
            target[cur_len  : cur_len + instruction_len] = IGNORE_TOKEN_ID
            cur_len += turn_len  # due to length of role token

        target[cur_len:] = IGNORE_TOKEN_ID

        if cur_len < self.sequence_len:
            if cur_len != total_len:
                target[:] = IGNORE_TOKEN_ID
                logging.warning(
                    f"WARNING: tokenization mismatch: {cur_len} vs. {total_len}."
                    f" (ignored)"
                    f" ID is: {conv.id}"
                )

        attention_mask = input_ids.ne(self.tokenizer.pad_token_id).tolist()
        input_ids = input_ids.tolist()
        target = target.tolist()
        # this is a fix for the tokenizer which tokenizes [ differently with eos tokens and
        # follows the original llama implementation
        for i in range(2, total_len - 2):
            if input_ids[i] == 29961:
                input_ids[i] = 518
            if target[i] == 29961:
                target[i] = 518
        return {
            "input_ids": input_ids,
            "labels": target,
            "attention_mask": attention_mask,
        }


class Llama2ChatPrompter:  # pylint: disable=too-few-public-methods
    """
    A prompter that generates prompts for Llama2 models.
    """

    def build_prompt(self, source) -> Generator[Llama2ChatConversation, None, None]:
        # see https://github.com/lm-sys/FastChat/blob/da0641e567cf93756b0978ab5a6b092e96f06240/fastchat/train/train.py#L78
        id = source["id"]

        conv = Llama2ChatConversation()
        conv.id = id
        conv.bot_name = source["bot_name"]
        conv.bot_age = source["bot_age"]
        conv.bot_character = source["bot_character"]
        conv.user_gender = source["user_gender"]
        conv.roles = ("USER:", f"{conv.bot_name.upper()}:")

        source = source["conversations"]  # fix data structure for datasets

        if len(source) < 2:
            # If there isn't a back and forth conversation, ignore it
            # also happens on the data splitting leaving empty conversations
            print(f"Id is: {conv.id}")
            raise IndexError

        roles = {"human": conv.roles[0], "character": conv.roles[1]}

        if roles[source[0]["from"]] != conv.roles[0]:
            # Skip the first one if it is not from human
            source = source[1:]

        conv.messages = []  # pylint: disable=R0801
        for j, sentence in enumerate(source):
            role = roles[sentence["from"]]
            assert role == conv.roles[j % 2], SHAREGPT_ASSERTION_FAILED_ROLE
            if sentence["value"]:
                conv.append_message(role, sentence["value"])
        yield conv

def load(tokenizer, cfg) -> LLama2ChatTokenizingStrategy:
    return LLama2ChatTokenizingStrategy(
        Llama2ChatPrompter(),
        tokenizer,
        cfg.train_on_inputs,
        cfg.sequence_len,
    )
