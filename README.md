# PWA Workouts
Una PWA muy básica que te permite introducir tus workouts en el sigsiguiente formato:

```json
{
    "id": "s1",
    "name": "Neurodinamia Sciatic Slider",
    "dificultyLevel": 2,
    "exercises": [
      {
        "name": "Sciatic Slider pierna derecha",
        "description": "Sentado, pierna extendida, tobillo en flexión y extensión mientras llevas cabeza adelante y atrás. Movimiento suave y controlado.",
        "mediaUrl": "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=1200&auto=format&fit=crop",
        "repetitionsCount": 12,
        "restingSeconds": 15
      },
      {
        "name": "Sciatic Slider pierna izquierda",
        "description": "Sentado, pierna extendida, tobillo en flexión y extensión mientras llevas cabeza adelante y atrás. Movimiento suave y controlado.",
        "mediaUrl": "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=1200&auto=format&fit=crop",
        "repetitionsCount": 12,
        "restingSeconds": 15
      }
    ]
}
```

> It uses Vite, checkout the package.json for commands.

```sh
npm run dev
npm run build
```

## LICENSE

MIT
