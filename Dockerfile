# syntax=docker/dockerfile:1
   
FROM node:12
WORKDIR /
COPY . .
RUN yarn install --production
CMD ["node", "index.js"]
EXPOSE 5000