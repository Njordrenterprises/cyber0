#!/bin/bash

# Start the API server in the background
deno run --unstable-kv --allow-net --allow-read --allow-env main.ts &
API_PID=$!

# Start Vite dev server
deno run --allow-read --allow-write --allow-net --allow-env --allow-run --allow-sys --allow-ffi npm:vite

# When Vite exits, kill the API server
kill $API_PID 