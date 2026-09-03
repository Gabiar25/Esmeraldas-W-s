# Instrucciones para Claude Code

## Git

- Después de hacer cambios que el usuario pidió, se puede hacer `git add` + `commit` + `push` a `origin/main` directamente, sin pedir confirmación primero. El usuario ya autorizó este flujo de forma general.
- Igual aplican las reglas de siempre: nunca `--force`, nunca `--no-verify`, nunca commits que revelen secretos, y usar `git status`/`git diff` antes de comitear para no incluir archivos que no correspondan.
