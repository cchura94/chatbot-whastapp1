## Instalar los paquetes de NODE
```
npm install
```
## Para levantar el Proyecto
```
npm run dev
```
- luego escanear el qr con whatsapp personal o business

### Para la OpenAI
- generar un token APi desde el panel de OPENAI y asignar en (src/index.js):
```
const respuesta = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o",
      messages: lista_mensajes,
    },
    {
      headers: {
        Authorization: `Bearer AQUI_TOKEN`,
        "Content-Type": "application/json",
      },
    }
  );
```
