"""Genere icon-192.png et icon-512.png sans dependance externe.

Pillow n'est pas installe sur cette machine : on encode le PNG a la main
(zlib + chunks + CRC), comme pour les autres applis perso.
Motif : une roue d'echappement couleur laiton sur fond encre.
Fond plein jusqu'aux bords : le telephone decoupe lui-meme le contour.
"""
import math
import struct
import zlib

FOND = (28, 33, 41)        # #1C2129 encre
LAITON = (214, 170, 85)    # #D6AA55
S = 4                      # sur-echantillonnage (anticrenelage)
DENTS = 15


def dans_roue(x, y, w):
    c = w / 2.0
    dx, dy = x - c, y - c
    d = math.hypot(dx, dy)
    a = math.atan2(dy, dx)
    r_jante_int = w * 0.205
    r_jante_ext = w * 0.255
    r_dent = w * 0.315
    # Dents en crochet (profil de roue d'echappement) : rampe sur chaque pas angulaire.
    pas = 2 * math.pi / DENTS
    t = ((a + math.pi) % pas) / pas          # 0 -> 1 le long d'un pas
    if r_jante_ext <= d <= r_dent and t < 0.55:
        # le haut de la dent se retrecit : pointe a t=0, base large
        hauteur = r_jante_ext + (r_dent - r_jante_ext) * (1 - t / 0.55)
        if d <= hauteur:
            return True
    if r_jante_int <= d <= r_jante_ext:
        return True
    if d <= w * 0.06:                         # moyeu
        return True
    # 4 bras
    for k in range(4):
        ang = k * math.pi / 2 + math.pi / 4
        ux, uy = math.cos(ang), math.sin(ang)
        proj = dx * ux + dy * uy
        perp = abs(-dx * uy + dy * ux)
        if 0 <= proj <= r_jante_int + 1 and perp <= w * 0.022:
            return True
    return False


def png(chemin, taille):
    lignes = bytearray()
    for py in range(taille):
        lignes.append(0)
        for px in range(taille):
            n = 0
            for sy in range(S):
                for sx in range(S):
                    if dans_roue(px + (sx + 0.5) / S, py + (sy + 0.5) / S, taille):
                        n += 1
            a = n / (S * S)
            pix = [int(FOND[i] * (1 - a) + LAITON[i] * a + 0.5) for i in range(3)]
            lignes += bytes((pix[0], pix[1], pix[2], 255))

    def chunk(nom, data):
        brut = nom + data
        return struct.pack(">I", len(data)) + brut + struct.pack(">I", zlib.crc32(brut) & 0xFFFFFFFF)

    entete = struct.pack(">IIBBBBB", taille, taille, 8, 6, 0, 0, 0)
    fichier = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", entete)
               + chunk(b"IDAT", zlib.compress(bytes(lignes), 9)) + chunk(b"IEND", b""))
    with open(chemin, "wb") as f:
        f.write(fichier)
    print(chemin, len(fichier), "octets")


png("icon-192.png", 192)
png("icon-512.png", 512)
