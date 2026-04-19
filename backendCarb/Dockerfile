# Image Python légère
FROM python:3.10-slim

# Dossier de travail
WORKDIR /app

# Copier les dépendances
COPY requirements.txt .

# Installer dépendances
RUN pip install --no-cache-dir -r requirements.txt

# Copier le code
COPY . .

# Exposer le port Flask
EXPOSE 5000

# Lancer l'application
CMD ["python", "app.py"]