export LANG=C.UTF-8

# Include Runpod specific env vars
if [[ -f /etc/rp_environment ]]; then
  source /etc/rp_environment
fi
