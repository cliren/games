# Picture Telephone blank-page console/network check

Date: 2026-09-14 UTC

## Result

Start a game visible after hard reload of `https://cliren.github.io/games/games/picture-telephone/?v=5c2a437`: **no**.

The page remains blank below the header. No `.screen` is active and no visible `#btn-start` exists.

## Concrete JavaScript error

A dynamic module import probe for `./js/app.js` rejected with this exact error:

```text
SyntaxError: Unexpected identifier 'escapeHtml'
```

Structured result:

```text
name: SyntaxError
message: Unexpected identifier 'escapeHtml'
stack: SyntaxError: Unexpected identifier 'escapeHtml'
```

This prevents `app.js` from initializing the screens, explaining the blank body. The same error occurred on `?v=fix1` and `?v=5c2a437`.

## URLs checked

- `https://cliren.github.io/games/games/picture-telephone/?v=fix1` — blank.
- `https://cliren.github.io/games/games/picture-telephone/index.html` — blank.
- `https://cliren.github.io/games/games/picture-telephone/?v=5c2a437` — blank; Start a game not visible.

## Network/module checks

The page resource timing showed the document loading `js/app.js` (and CSS), with no failed `.js` request exposed there. Fetch checks returned HTTP 200 / `application/javascript` for all requested module URLs:

- `/games/games/picture-telephone/js/prompts.js`
- `/games/games/picture-telephone/js/canvas.js`
- `/games/games/picture-telephone/js/qr.js`
- `/games/games/picture-telephone/js/howto.js`
- `/games/games/shared/fun-names.js` (the resolved URL for `../../shared/fun-names.js`)
- `/games/games/picture-telephone/js/state.js`
- `/games/games/picture-telephone/js/app.js`

Therefore the concrete failure captured is the `SyntaxError` above, not a module 404.
