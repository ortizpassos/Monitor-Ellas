cd "C:\projetos\CosturaTech"
git init
git add .
git commit -m "Criação do repositório"
git remote add origin https://github.com/ortizpassos/CosturaTech.git
gh repo create CosturaTech --public --source=. --push --description "Projetos com CosturaTech"
git branch -M main
git push -u origin main