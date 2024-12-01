#!/bin/bash

# Find and kill all deno run processes except LSP
pids=$(ps aux | grep "deno run" | grep -v "grep" | awk '{print $2}')

if [ -z "$pids" ]; then
  echo "No Deno server processes found."
  exit 0
fi

echo "Found Deno processes: $pids"

# First try graceful shutdown
for pid in $pids; do
  echo "Attempting graceful shutdown of process $pid..."
  kill $pid
done

# Wait a moment
sleep 1

# Check if any processes remain and force kill them
remaining_pids=$(ps aux | grep "deno run" | grep -v "grep" | awk '{print $2}')
if [ ! -z "$remaining_pids" ]; then
  echo "Force killing remaining processes..."
  for pid in $remaining_pids; do
    echo "Force killing process $pid..."
    kill -9 $pid
  done
fi

# Final verification
remaining_pids=$(ps aux | grep "deno run" | grep -v "grep" | awk '{print $2}')
if [ -z "$remaining_pids" ]; then
  echo "All Deno server processes successfully terminated."
else
  echo "Warning: Some processes may still be running: $remaining_pids"
fi 