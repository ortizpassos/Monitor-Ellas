cd "C:\Users\Eduardo\OneDrive\Desktop\Projetos2025\Monitor-Ellas"
git init
git add .
git commit -m "Criação do repositório"
git remote add origin https://github.com/ortizpassos/Monitor-Ellas.git
gh repo create Monitor-Ellas --public --source=. --push --description "Projetos com Monitor-Ellas"
git branch -M main
git push -u origin main