FROM node:22

WORKDIR /app

# Copier uniquement les dépendances
COPY package*.json ./

# Installer dépendances (cache Docker)
RUN npm install --legacy-peer-deps

# Copier le reste du projet
COPY . .

# Build Angular
RUN npm run build

# Lancer app
CMD ["npm", "start"]