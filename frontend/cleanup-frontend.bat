cd C:\Users\김명호\IdeaProjects\capstone-diary\frontend

rmdir /s /q config
rmdir /s /q diary
rmdir /s /q venv

del manage.py
del requirements.txt
del db.sqlite3

git add .
git commit -m "refactor: Remove backend files"
git push origin main --force