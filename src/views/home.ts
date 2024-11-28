export const layout = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your App</title>
    ${Deno.env.get("DEV") 
      ? `<script type="module" src="http://localhost:5173/src/client/main.ts"></script>`
      : `<script type="module" src="/assets/main.js"></script>
         <link rel="stylesheet" href="/assets/styles.css">`
    }
    <script src="https://unpkg.com/htmx.org@1.9.6"></script>
</head>
<body>
    ${content}
</body>
</html>
`; 