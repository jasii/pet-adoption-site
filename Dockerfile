# Stage 1: Build the React app
FROM node:14 AS build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the React app
RUN npm run build

# Stage 2: Serve the React app with Nginx
FROM nginx:stable-alpine AS production

# Copy the built React app from the build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy the Nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for the Nginx server
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]

# Stage 3: Run the backend server
FROM node:14 AS server

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json for the backend
COPY backend/package*.json ./backend/

# Install dependencies for the backend
RUN cd backend && npm ci

# Copy the rest of the backend code
COPY backend ./backend

# Set the environment variables
ENV ADMIN_PASSWORD=admin123
ENV TELEGRAM_BOT_TOKEN=your_telegram_bot_token
ENV TELEGRAM_CHAT_ID=your_telegram_chat_id

# Expose the port the server runs on
EXPOSE 5000

# Start the server
CMD ["node", "backend/server.js"]