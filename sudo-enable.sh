#!/bin/bash
echo 'vals ALL=(ALL) NOPASSWD: ALL' | sudo tee /etc/sudoers.d/vals-nopasswd > /dev/null
echo "Passwordless sudo enabled for vals"
