# Pushoff – interactive mockup (HW 1)

Pushoff helps skaters find the skatepark that fits **their** style and level, and tells them **when it will be empty**.

This is a clickable mockup: it looks and behaves like the real app, but all data is hard-coded sample data (fictional parks) and nothing is saved.

## Run it

No build step, no dependencies. Either open `index.html` in a browser, or:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

On a desktop it shows inside a phone frame. Open it on a phone (or shrink the window) and it fills the screen.

## How it meets the assignment

**Novel idea.** Skatepark finders mostly show a map of pins. Pushoff is built around two questions they don't answer: *is this park right for my style and skill?* and *will I have room to skate right now?*

**Recommender system (For You tab).** Each park gets a match score from your styles, level, session goal, distance and the feedback you give ("not for me" lowers parks with similar features). Every card says why it was recommended. Try it: change your level or goal on the Profile tab, or tap the X on a card, and watch the ranking change.

**Predictive model (crowd forecast).** Every park has an hourly forecast of how busy it will be, for today and tomorrow. The "Best time to roll" card, the map pins, the best-window highlight on the park page and the session planner all use it.

## Screens to click through

1. Onboarding: styles, level, goal, then a "building your feed" screen
2. **For You**: ranked parks with match %, reasons, filters, and "not for me"
3. **Map**: pins show predicted crowd right now, tap a pin for a summary card
4. **Park page**: match breakdown, crowd forecast chart (tap bars, switch day), features, tip
5. **Plan a session**: pick a slot with the forecast shown per hour
6. **Sessions**: planned sessions with a forecast re-check tip, plus saved parks
7. **Profile**: edit your taste profile and see the feed re-rank

## Files

- `index.html` – page shell
- `styles.css` – all styling
- `data.js` – fictional parks and the stand-in crowd model
- `app.js` – screens, navigation, stand-in recommender

## Put it on GitHub (private) and invite the instructor

```bash
git init
git add .
git commit -m "HW1: Pushoff interactive mockup"
git branch -M main
# Create an empty PRIVATE repo on github.com/new first, then:
git remote add origin https://github.com/<your-username>/pushoff-mockup.git
git push -u origin main
```

Then on GitHub: **Settings → Collaborators → Add people → `tedaueb`**. Submit the repo link on e-class.
