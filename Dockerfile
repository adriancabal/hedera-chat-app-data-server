# This line basically says ‘we need to use this light-weight version of Linux which has Node pre-installed’
FROM node:alpine

# This line opens port 3000
EXPOSE 4420

# This line copies everything from the directory (.) in to the folder (/app)
COPY . /app

# This line says that we want to run all commands within the folder (/app)
WORKDIR /app

# This line installs the node package express. This is why it’s important to write down all packages you’re using. Sometimes you’ll need to save the specific versions when you’re installing packages too!
RUN npm install express@^4.18.1 --save

RUN npm install @hashgraph/sdk@^2.14.2 --save

RUN npm install dotenv@^16.0.1 --save

RUN npm install socket.io@^4.5.1 --save

# This line runs the command ‘node main.js’
CMD [ "node", "app.js" ]

