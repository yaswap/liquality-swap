#!/bin/bash
help () {
   # Display Help
   echo "Script to change the machine IP which deploy all yaswap ecosystem"
   echo
   echo "Syntax: ./change_URL.sh <new_IP>"
   echo
}

old_IP="68.117.213.163"
echo "Change machine IP from $old_IP to $1"
# Get the options
git ls-files -z | xargs -0 sed -i -e "s/$old_IP/$1/g"
