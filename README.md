# datavant-website-revamp

Revamp UI/UX de la home de [datavant.com](https://www.datavant.com/) con comparador interactivo before/after.

## Estructura

- `before/` — snapshot estático de la home actual (HTML descargado; assets cargan desde el CDN de Datavant vía `<base href>`). `theme.css` es el CSS del tema para referencia de la paleta.
- `after/` — propuesta rediseñada: un solo HTML autocontenido con el mismo contenido e imágenes reales, pero con jerarquía, espaciado y color mejorados.
- `compare/` — visor interactivo: lado a lado, slider deslizable y toggle, con scroll sincronizado y panel de mejoras aplicadas.

## Uso

```bash
python3 -m http.server 4173
open http://localhost:4173/compare/
```

## Paleta de marca (extraída del CSS del tema)

| Token | Valor |
|---|---|
| Brand blue | `#475ff2` |
| Cyan | `#14e7e8` |
| Cyan soft | `#d6ffff` |
| Ink / navy | `#101828` / `#020202` |
| Off-white | `#eceae4` |
| Muted text | `#475467` |

Tipografía: DM Sans (Google Fonts) — el sitio usa PP Mori + DM Sans.
