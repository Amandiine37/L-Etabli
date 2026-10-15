"""Petit serveur local pour tester l'app (usage developpement uniquement).

Ne pas mettre en ligne : GitHub Pages sert les fichiers lui-meme.
"""
import functools
import http.server
import os

PORT = 4220
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def guess_type(self, path):
        if path == "/" or path.endswith(".html"):
            return "text/html; charset=utf-8"
        if path.endswith(".js"):
            return "text/javascript; charset=utf-8"
        if path.endswith(".webmanifest"):
            return "application/manifest+json; charset=utf-8"
        return super().guess_type(path)

    def end_headers(self):
        # Pas de cache en developpement : on veut toujours la derniere version.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


Handler = functools.partial(Handler, directory=DIRECTORY)

# ThreadingHTTPServer : un service worker garde des connexions ouvertes, ce qui
# fige un serveur monothread et bloque toutes les requetes suivantes.
with http.server.ThreadingHTTPServer(("", PORT), Handler) as httpd:
    httpd.daemon_threads = True
    httpd.serve_forever()
