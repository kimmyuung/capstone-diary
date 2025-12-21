cd C:\Users\김명호\IdeaProjects\capstone-diary\backend

rmdir /s /q app
rmdir /s /q components
rmdir /s /q assets
rmdir /s /q node_modules

del App.js
del package.json
del tsconfig.json

git add .
git commit -m "refactor: Remove frontend files"
git push origin main --force