#!/bin/bash

# Base URL
BASE_URL="http://localhost:8000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Function to print responses nicely
print_response() {
  local response=$1
  echo "Response:"
  echo "$response"
  echo
}

# Function to extract ID from JSON response
extract_id() {
  local response=$1
  echo "$response" | grep -o '"id":"[^"]*' | cut -d'"' -f4
}

echo "Testing Card Endpoints..."

# Create a card
echo -e "\n${GREEN}Creating a test card...${NC}"
CARD_RESPONSE=$(curl -s -X POST "$BASE_URL/cards/info/create" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Card"}')
print_response "$CARD_RESPONSE"

# Extract card ID
CARD_ID=$(extract_id "$CARD_RESPONSE")
echo "Card ID: $CARD_ID"

# List cards
echo -e "\n${GREEN}Listing all cards...${NC}"
RESPONSE=$(curl -s "$BASE_URL/cards/info/list")
print_response "$RESPONSE"

# Get specific card
echo -e "\n${GREEN}Getting card details...${NC}"
RESPONSE=$(curl -s "$BASE_URL/cards/info/api?cardId=$CARD_ID")
print_response "$RESPONSE"

# Add message to card
echo -e "\n${GREEN}Adding message to card...${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/cards/info/api" \
  -H "Content-Type: application/json" \
  -d "{\"cardId\":\"$CARD_ID\",\"text\":\"Test message\"}")
print_response "$RESPONSE"

# List messages
echo -e "\n${GREEN}Listing card messages...${NC}"
RESPONSE=$(curl -s "$BASE_URL/cards/info/api/messages?cardId=$CARD_ID")
print_response "$RESPONSE"

# Test error cases
echo -e "\n${GREEN}Testing error cases...${NC}"

# Empty name
echo -e "\n${GREEN}Creating card with empty name...${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/cards/info/create" \
  -H "Content-Type: application/json" \
  -d '{"name":""}')
print_response "$RESPONSE"

# Non-existent card
echo -e "\n${GREEN}Getting non-existent card...${NC}"
RESPONSE=$(curl -s "$BASE_URL/cards/info/api?cardId=non-existent-id-123")
print_response "$RESPONSE"

# Add message to non-existent card
echo -e "\n${GREEN}Adding message to non-existent card...${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/cards/info/api" \
  -H "Content-Type: application/json" \
  -d '{"cardId":"non-existent-id-123","text":"Test message"}')
print_response "$RESPONSE"

# Delete card
echo -e "\n${GREEN}Deleting test card...${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/cards/info/delete" \
  -H "Content-Type: application/json" \
  -d "{\"cardId\":\"$CARD_ID\"}")
print_response "$RESPONSE"

# Verify deletion
echo -e "\n${GREEN}Verifying card deletion...${NC}"
RESPONSE=$(curl -s "$BASE_URL/cards/info/api?cardId=$CARD_ID")
print_response "$RESPONSE"

echo -e "\n${GREEN}Tests completed${NC}" 