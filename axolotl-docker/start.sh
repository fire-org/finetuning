#!/bin/bash

# Export useful ENV variables, including all Runpod specific vars, to /etc/rp_environment
# This file can then later be sourced in a login shell
echo "Exporting environment variables..."
printenv |
	grep -E '^RUNPOD_|^PATH=|^HF_HOME=|^VOLUME=|^HUGGING_FACE_HUB_TOKEN=|^_=' |
	sed 's/^\(.*\)=\(.*\)$/export \1="\2"/' >>/etc/rp_environment

# Add it to Bash login script in case anyone uses that
# We don't need to do the same for ZSH as it's sourced included automatically in ~/.zsh/env.zsh
echo 'source /etc/rp_environment' >>~/.bashrc

# Vast.ai uses $SSH_PUBLIC_KEY
if [[ $SSH_PUBLIC_KEY ]]; then
	PUBLIC_KEY="${SSH_PUBLIC_KEY}"
fi

# Runpod uses $PUBLIC_KEY
if [[ $PUBLIC_KEY ]]; then
	mkdir -p ~/.ssh
	chmod 700 ~/.ssh
	echo "${PUBLIC_KEY}" >>~/.ssh/authorized_keys
	chmod 700 -R ~/.ssh
fi

service ssh start

mkdir -p "$VOLUME"/logs

export VOLUME HF_HOME HUGGING_FACE_HUB_TOKEN WANDB_TOKEN GITHUB_TOKEN

/setup-and-clone.sh 2>&1 | tee -a "$VOLUME"/logs/clone.log

sleep infinity
