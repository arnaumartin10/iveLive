# Maestro flows

Run `profile-sections.yaml` on an installed app with a signed-in test account to
verify the Profile, Timeline, Wishlist, and Friends sections. The flow keeps app
state so it does not attempt to automate authentication.

Run `genre-page-navigation.yaml` on a signed-in test build after seeding the
Rock genre page. It deep-links to Rock, opens a pillar Artist Card, follows that
card's Rock label, opens the pillar again, and returns to the genre page.
