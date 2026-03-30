FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# Build the production bundle at image build time
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV API_URL=$API_URL

RUN npm run build

EXPOSE 3000

# Run the production server (fast, pre-compiled)
CMD ["npm", "run", "start"]
