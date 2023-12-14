# Based on the Docker image provided in the Axolotl repo
ARG PYTHON=3.10
ARG CUDA=118
ARG PYTORCH=2.0.1
ARG BASE_TAG=main-py$PYTHON-cu$CUDA-$PYTORCH
FROM winglian/axolotl:$BASE_TAG

# Install openssh and useful command line utility software
ENV DEBIAN_FRONTEND noninteractive
ARG APTPKGS="zsh wget tmux tldr nvtop vim neovim curl rsync net-tools less iputils-ping 7zip zip unzip htop inotify-tools"
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends openssh-server openssh-client git git-lfs && \
    apt-get install -y $APTPKGS && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ENV HOME /root
WORKDIR $HOME

RUN pip3 install ipython

# Workaround for issue in Transformers
RUN pip3 install 'huggingface-hub>=0.19'
RUN pip3 install deepspeed==0.12.3

# Set up git to support LFS, and to store credentials; useful for Huggingface Hub
RUN git config --global credential.helper store && \
    git lfs install

RUN mkdir -p $HOME/.ssh && \
    chmod 700 $HOME/.ssh

COPY --chmod=755 start.sh /start.sh
COPY --chmod=755 setup-and-clone.sh /setup-and-clone.sh

# Ensure SSH access. Not needed for Runpod but is required on Vast and other Docker hosts
EXPOSE 22/tcp

ENV VOLUME /workspace
ENV HF_HOME $VOLUME/huggingface

ENTRYPOINT [ "/start.sh" ]
