# Use an official Node.js runtime as a parent image
FROM node:14

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React app
RUN npm run build

# Install serve to serve the build
RUN npm install -g serve

# Set the environment variables
ENV ADMIN_PASSWORD=admin123
ENV TELEGRAM_BOT_TOKEN=your_telegram_bot_token
ENV TELEGRAM_CHAT_ID=your_telegram_chat_id

# Expose the port the app runs on
EXPOSE 3000
EXPOSE 5000

# Start the server and the React app
CMD ["npm", "run", "start"]