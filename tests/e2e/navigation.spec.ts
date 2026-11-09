import { expect, test, type Page, type Route } from '@playwright/test';

const user = {
  id: '00000000-0000-4000-8000-000000000001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'listener@example.test',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { display_name: 'Test Listener' },
  created_at: '2026-01-01T00:00:00.000Z',
};

const profile = {
  id: user.id,
  username: 'test_listener',
  display_name: 'Test Listener',
  avatar_url: null,
  banner_image_url: null,
  bio: null,
  is_private: false,
  created_at: user.created_at,
  updated_at: user.created_at,
};

const artist = {
  id: '00000000-0000-4000-8000-000000000002',
  name: 'Playwright Artist',
  source: 'musicbrainz',
  genres: [],
  macro_genres: [],
  sub_genres: [],
  user_edited_fields: [],
  lastfm_tags: [],
  banner_image_url: null,
  begin_year: null,
  begin_year_source: null,
  bio: null,
  bio_attribution: null,
  bio_lang: null,
  bio_source: null,
  bio_url: null,
  created_at: user.created_at,
  created_by: null,
  enriched_at: null,
  enrichment_error: null,
  enrichment_status: 'complete',
  group_image_url: null,
  image_url_large: null,
  image_url_thumb: null,
  is_on_tour: false,
  last_enrichment_requested_at: null,
  last_synced_at: null,
  musicbrainz_id: null,
  name_normalized: 'playwright artist',
  popularity: null,
  primary_macro: null,
  public_avg_rating: null,
  public_rating_count: 0,
  public_weighted_rating: null,
  spotify_id: null,
  tour_end_date: null,
  tour_last_checked_at: null,
  tour_start_date: null,
  wikidata_id: null,
  wikipedia_title: null,
};

const concert = {
  id: 'playwright-log',
  artist_id: artist.id,
  user_id: user.id,
  event_date: '2026-01-15',
  venue_type: 'festival',
  venue_name: 'Test Venue',
  review: null,
  rating: null,
  created_at: user.created_at,
  updated_at: user.created_at,
  artist,
  media: [],
};

const session = {
  access_token: 'playwright-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'playwright-refresh-token',
  user,
};

let logInsertRequests = 0;

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function installAuthFixtures(page: Page) {
  await page.route('**/auth/v1/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/logout')) {
      await route.fulfill({ status: 204, body: '' });
    } else if (pathname.endsWith('/otp')) {
      await fulfillJson(route, {});
    } else if (pathname.endsWith('/verify') || pathname.endsWith('/token')) {
      await fulfillJson(route, session);
    } else if (pathname.endsWith('/user')) {
      await fulfillJson(route, user);
    } else {
      await fulfillJson(route, {});
    }
  });

  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/profiles')) {
      await fulfillJson(route, profile);
    } else if (url.pathname.endsWith('/artists')) {
      if (
        url.searchParams.get('id') === 'eq.playwright-artist' ||
        url.searchParams.get('id') === `eq.${artist.id}`
      ) {
        await fulfillJson(route, artist);
      } else {
        await fulfillJson(
          route,
          {
            code: 'PGRST116',
            message: 'No artist matched the requested ID.',
          },
          406,
        );
      }
    } else if (url.pathname.endsWith('/concert_logs')) {
      if (route.request().method() === 'POST') {
        logInsertRequests += 1;
        await route.fulfill({ status: 201, body: '' });
      } else if (url.searchParams.get('id') === 'eq.playwright-log') {
        await fulfillJson(route, concert);
      } else if (url.searchParams.get('user_id') === `eq.${user.id}`) {
        await fulfillJson(route, [concert]);
      } else {
        await fulfillJson(
          route,
          {
            code: 'PGRST116',
            message: 'No concert matched the requested ID.',
          },
          406,
        );
      }
    } else if (url.pathname.endsWith('/rpc/is_username_available')) {
      await fulfillJson(route, true);
    } else {
      await fulfillJson(route, []);
    }
  });
}

async function signInAt(page: Page, destination: string) {
  await page.goto(destination);
  const emailField = page.getByLabel('Email address');
  await emailField.waitFor();
  await emailField.fill(user.email);
  await page.getByRole('button', { name: 'Continue with email' }).click();
  const codeField = page.getByLabel('Email sign-in code');
  await codeField.waitFor();
  await codeField.fill('123456');
  await page.getByRole('button', { name: 'Sign in with code' }).click();
}

test.beforeEach(async ({ page }) => {
  logInsertRequests = 0;
  await installAuthFixtures(page);
});

test('dev layout harness stays inside the viewport on mobile devices', async ({
  page,
}, testInfo) => {
  await page.goto('/layout-check');
  await expect(page.getByText('Layout check')).toBeVisible();

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const layout = await page.evaluate(() => {
    return {
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.bodyWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.viewportWidth).toBe(viewport!.width);

  const controls = page.locator(
    'button, [role="button"], [role="link"], input, textarea, select',
  );
  const controlCount = await controls.count();
  for (let index = 0; index < controlCount; index += 1) {
    const control = controls.nth(index);
    await control.scrollIntoViewIfNeeded();
    const bounds = await control.boundingBox();
    expect(bounds, `control ${index} should be visible`).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport!.width);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport!.height);
  }

  const longTextLayouts = await page
    .getByText(
      'The Extremely Long Artist Name That Should Wrap Across Two Lines Without Clipping',
      { exact: true },
    )
    .evaluateAll((elements) =>
      elements.map((element) => ({
        text: element.textContent,
        lineClamp: getComputedStyle(element).getPropertyValue(
          '-webkit-line-clamp',
        ),
      })),
    );
  expect(longTextLayouts.length).toBeGreaterThan(0);
  for (const textLayout of longTextLayouts) {
    expect(textLayout.text).toBe(
      'The Extremely Long Artist Name That Should Wrap Across Two Lines Without Clipping',
    );
    expect(textLayout.lineClamp).not.toMatch(/^[1-9]\d*$/);
  }

  await page.evaluate(() => {
    window.scrollTo(0, 0);
    for (const element of document.querySelectorAll<HTMLElement>('*')) {
      if (element.scrollTop > 0) element.scrollTop = 0;
    }
  });
  const screenshot = testInfo.outputPath('layout-check.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  await testInfo.attach('layout-check', {
    path: screenshot,
    contentType: 'image/png',
  });
});

test('signed-out deep link returns to its target after email sign-in', async ({
  page,
}) => {
  await signInAt(page, '/artist/playwright-artist');
  await expect(page).toHaveURL(/\/artist\/playwright-artist$/);
  await expect(page).toHaveTitle('Artist · IveLive');
});

test('artist, genre, and log routes render standalone and survive refresh', async ({
  page,
}) => {
  await signInAt(page, '/artist/playwright-artist');

  const destinations = [
    ['/artist/playwright-artist', 'Artist · IveLive'],
    ['/genre/playwright-genre', 'Genre · IveLive'],
    ['/log/playwright-log', 'Concert log · IveLive'],
  ] as const;

  for (const [path, title] of destinations) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page).toHaveTitle(title);
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.locator('body')).not.toBeEmpty();
  }
});

test('invalid artist, genre, and log routes show explicit empty states', async ({
  page,
}) => {
  await signInAt(page, '/artist/playwright-artist');

  await page.goto('/artist/missing-artist');
  await expect(page.getByText('Could not load artist')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Go home' })).toBeVisible();

  await page.goto('/genre/missing-genre');
  await expect(page.getByText('This genre could not be found.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to music' })).toBeVisible();

  await page.goto('/log/missing-log');
  await expect(
    page.getByText('This log is private or no longer exists'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Go back' })).toBeVisible();
});

test('deep-link back uses a screen fallback when no app history exists', async ({
  page,
}) => {
  await signInAt(page, '/artist/playwright-artist');
  await expect(page).toHaveURL(/\/artist\/playwright-artist$/);
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('Back leaves the saved-log photo stage for its completion screen', async ({
  page,
}) => {
  await signInAt(page, '/log/step-keepsakes?id=playwright-log');
  await expect(page.getByText('Keep a little piece of the night')).toBeVisible();
  await page.getByRole('button', { name: 'Go back' }).click();
  await expect(page).toHaveURL(/\/log\/done\?id=playwright-log&skipped=true$/);
});

test('X leaves the saved-log photo stage for its completion screen', async ({
  page,
}) => {
  await signInAt(page, '/log/step-keepsakes?id=playwright-log');
  await expect(page.getByText('Keep a little piece of the night')).toBeVisible();
  await page.getByRole('button', { name: 'Close photo upload' }).click();
  await expect(page).toHaveURL(/\/log\/done\?id=playwright-log&skipped=true$/);
});

test('wizard X confirms discard and Keep editing leaves the draft intact', async ({
  page,
}) => {
  await signInAt(page, '/log');
  await page.getByRole('button', { name: 'Quick pick Playwright Artist' }).click();
  await expect(page.getByText('Date', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Discard and close' }).click();
  await expect(page.getByText('Discard this log?')).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByText('Discard this log?')).toHaveCount(0);
  await expect(page.getByText('Date', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Discard and close' }).click();
  await page.getByRole('button', { name: 'Discard', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});

async function advanceNewLogToReview(page: Page) {
  await signInAt(page, '/log');
  await page.getByRole('button', { name: 'Quick pick Playwright Artist' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Festival. Multi-stage festivals and outdoor music gatherings',
    })
    .click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: '1 star' }).click();
}

test('new log remains a draft through photos and Back returns to review', async ({
  page,
}) => {
  await advanceNewLogToReview(page);
  await page.getByRole('button', { name: 'Continue to photos' }).click();
  await expect(page.getByText('Your log will be saved when you finish.')).toBeVisible();
  expect(logInsertRequests).toBe(0);

  await page.getByRole('button', { name: 'Go back' }).click();
  await expect(page.getByText('Rate the show')).toBeVisible();
  expect(logInsertRequests).toBe(0);

  await page.getByRole('button', { name: 'Continue to photos' }).click();
  await page.getByRole('button', { name: 'Discard and close' }).click();
  await expect(page.getByText('Discard this log?')).toBeVisible();
  await page.getByRole('button', { name: 'Discard', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(logInsertRequests).toBe(0);
});

test('new log is inserted only when finishing the photo stage', async ({
  page,
}) => {
  await advanceNewLogToReview(page);
  await page.getByRole('button', { name: 'Continue to photos' }).click();
  expect(logInsertRequests).toBe(0);

  await page.getByRole('button', { name: 'Save to my archive' }).click();
  await expect(page).toHaveURL(/\/log\/done\?id=/);
  expect(logInsertRequests).toBe(1);
});

test('browser Back after a fresh deep link leaves the screen instead of trapping', async ({
  page,
}) => {
  await signInAt(page, '/artist/playwright-artist');
  await page.goBack();
  await expect
    .poll(() => new URL(page.url()).pathname)
    .not.toBe('/artist/playwright-artist');
});

test('unknown paths show the friendly not-found screen', async ({ page }) => {
  await signInAt(page, '/artist/playwright-artist');
  await page.goto('/this-route-does-not-exist');
  await expect(page.getByText('Show cancelled')).toBeVisible();
  await page.getByRole('button', { name: 'Go home' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('sign-out followed by browser Back does not reveal a signed-in screen', async ({
  page,
}) => {
  await signInAt(page, '/artist/playwright-artist');
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/welcome$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByLabel('Email address')).toBeVisible();
});
