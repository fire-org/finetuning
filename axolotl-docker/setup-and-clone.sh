#!/bin/bash

VOLUME="${VOLUME:-/workspace}"
HF_HOME="${HF_HOME:-/$VOLUME/huggingface}"
AXOLOTLCOMMIT="${AXOLOTLCOMMIT:-a48dbf6561cc74c275a48070f397334a2c367dd5}"

mkdir -p "$HF_HOME"
mkdir -p "$VOLUME"/models
mkdir -p "$VOLUME"/data

cd "$VOLUME"

# If a Github access token is specified in GITHUB_TOKEN env var, write it to .git-credentials on the volume if it's not already there
# We put the Git credentials on the volume so any changes will persist after pod shutdown/restart
if [[ $GITHUB_TOKEN ]]; then
	if [[ "$GIT_HUB_TOKEN" != "token_here" ]]; then
		if ! grep "$GITHUB_TOKEN" "$VOLUME"/.git-credentials >/dev/null 2>&1; then
			echo "https://${GITHUB_TOKEN}@github.com" >>"$VOLUME"/.git-credentials
		fi
	fi
fi

# Link the volume git credentials to the home directory so they're usable by Git
ln -s "$VOLUME"/.git-credentials ~/.git-credentials

# Add WanDB login token if found
if [[ $WANDB_TOKEN ]]; then
	if [[ "$WANDB_TOKEN" != "token_here" ]]; then
		wandb login "$WANDB_TOKEN"
	fi
fi

# Add HF token if found in env var
if [[ $HUGGING_FACE_HUB_TOKEN ]]; then
	if [[ "$HUGGING_FACE_HUB_TOKEN" != "token_here" ]]; then
		huggingface-cli login --token "$HUGGING_FACE_HUB_TOKEN" --add-to-git-credential
	fi
fi

# Some scripts with useful functions such as HF model uploading/download
# Not actually used any more I think, since huggingface-hub added upload/download features
AISCRIPTS=$VOLUME/AIScripts
if [[ ! -d "$AISCRIPTS" ]]; then
	git clone https://github.com/TheBlokeAI/AIScripts "$AISCRIPTS"
else
	(cd "$AISCRIPTS" && git pull)
fi

# Clone the master Axolotl repo
AXOLOTL=$VOLUME/axolotl
if [[ ! -d "$AXOLOTL" ]]; then
	(
		git clone https://github.com/OpenAccess-AI-Collective/axolotl "$AXOLOTL" &&
			cd "$AXOLOTL" &&
			git checkout "$AXOLOTLCOMMIT"
	)
else
	(cd "$AXOLOTL" && git pull)
fi

# Clone our Axolotl config and code
# This one is private and needs a key or credential
AXOLOTLCONFIG=$VOLUME/axolotl-config
FINETUNING=$VOLUME/finetuning-thebloke
if [[ ! -d "$AXOLOTLCONFIG" ]]; then
	git clone https://github.com/fire-org/finetuning-thebloke "$FINETUNING" && ln -s "$FINETUNING"/axolotl-config "$AXOLOTLCONFIG"
else
	(cd "$AXOLOTLCONFIG" && git pull)
fi

# Install our cloned Axolotl into the active Python environment
(cd "$AXOLOTL" && pip3 install -e .)

pip3 uninstall -y deepspeed && pip3 install --upgrade deepspeed==0.12.3
pip3 install --upgrade huggingface-hub

ln -s "$AXOLOTLCONFIG"/prompt_strategies/orion.py "$AXOLOTL"/src/axolotl/prompt_strategies/orion.py
