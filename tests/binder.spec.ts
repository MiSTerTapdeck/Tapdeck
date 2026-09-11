import {test,expect} from '@playwright/test';
test('console and computer pickers combine with search and reset between families',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Switch to card view'}).click();await page.getByRole('button',{name:'Consoles',exact:true}).click();
 await expect(page.getByTestId('system-filter-control')).toBeVisible();
 await page.getByRole('button',{name:'Choose a console, currently all consoles'}).click();
 await page.getByRole('radio',{name:'SNES',exact:true}).click();
 await expect(page.getByRole('button',{name:'Choose a console, currently SNES'})).toBeVisible();
 await expect(page.getByTestId('card-super-metroid')).toBeVisible();await expect(page.getByTestId('card-sonic-2')).toHaveCount(0);
 await page.getByRole('textbox',{name:'Search games'}).fill('Turrican');await expect(page.getByTestId('card-super-turrican')).toBeVisible();await expect(page.getByTestId('card-super-metroid')).toHaveCount(0);
 await page.getByRole('button',{name:'Clear search'}).click();await page.getByRole('button',{name:'Choose a console, currently SNES'}).click();
 await page.getByRole('textbox',{name:'Search consoles'}).fill('Mega');await expect(page.getByRole('radio',{name:'SNES',exact:true})).toHaveCount(0);await page.getByRole('radio',{name:'Mega Drive',exact:true}).click();
 await expect(page.getByTestId('card-sonic-2')).toBeVisible();await expect(page.getByTestId('card-super-metroid')).toHaveCount(0);
 await page.getByRole('button',{name:'Choose a console, currently Mega Drive'}).click();await page.getByRole('radio',{name:'All consoles',exact:true}).click();await expect(page.getByTestId('card-super-metroid')).toBeVisible();
 await page.getByRole('button',{name:'Computers',exact:true}).click();await expect(page.getByRole('button',{name:'Choose a computer, currently all computers'})).toBeVisible();
 await page.getByRole('button',{name:'Choose a computer, currently all computers'}).click();await page.getByRole('radio',{name:'Amiga',exact:true}).click();await expect(page.getByTestId('card-turrican-ii-amiga')).toBeVisible();
 await page.getByRole('button',{name:'Arcade',exact:true}).click();await expect(page.getByTestId('system-filter-control')).toHaveCount(0);await expect(page.getByTestId('card-bubble-bobble')).toBeVisible();
 await page.getByRole('button',{name:'Consoles',exact:true}).click();await expect(page.getByRole('button',{name:'Choose a console, currently all consoles'})).toBeVisible();
 await page.getByRole('button',{name:'Choose a console, currently all consoles'}).click();await page.getByRole('radio',{name:'SNES',exact:true}).click();await page.screenshot({path:'../screenshots/consoles-snes.png'});
});
test('genre picker and thumbnail list view work together',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Choose a genre, currently all genres'}).click();
 await page.getByRole('textbox',{name:'Search genres'}).fill('Platform');await page.getByRole('radio',{name:'Platform',exact:true}).click();
 await expect(page.getByRole('button',{name:'Choose a genre, currently Platform'})).toBeVisible();await expect(page.getByTestId('row-super-metroid')).toBeVisible();
 expect((await page.getByTestId('row-super-metroid').boundingBox())!.height).toBeGreaterThan(70);
 await page.getByRole('button',{name:'Switch to card view'}).click();await expect(page.getByTestId('card-super-metroid')).toBeVisible();await page.getByRole('button',{name:'Switch to list view'}).click();await expect(page.getByTestId('row-super-metroid')).toBeVisible();
 await page.getByRole('button',{name:'Choose a genre, currently Platform'}).click();await page.getByRole('radio',{name:'All genres',exact:true}).click();await expect(page.getByTestId('row-metroid')).toBeVisible();
});
test('library search, categories, empty state, and single-card dimensions',async({page})=>{
 await page.goto('/');await expect(page.getByTestId('row-super-metroid')).toBeVisible();await page.getByRole('button',{name:'Switch to card view'}).click();await expect(page.getByTestId('card-super-metroid')).toBeVisible();
 await page.getByRole('button',{name:'Computers',exact:true}).click();
 await expect(page.getByTestId('card-turrican-ii-amiga')).toBeVisible();
 expect((await page.getByTestId('card-turrican-ii-amiga').boundingBox())!.width).toBeLessThan(180);
 await expect(page.getByTestId('card-super-metroid')).toHaveCount(0);
 await page.getByRole('button',{name:'All',exact:true}).click();await page.getByRole('textbox',{name:'Search games'}).fill('SONIC');
 await expect(page.getByTestId('card-sonic-2')).toBeVisible();await expect(page.getByTestId('card-super-metroid')).toHaveCount(0);
 await page.getByRole('textbox',{name:'Search games'}).fill('not a game');await expect(page.getByText('No cards here. Yet.')).toBeVisible();
 await page.getByRole('button',{name:'Browse all games'}).click();await expect(page.getByTestId('card-super-metroid')).toBeVisible();
});
test('opening, story expansion, persistent save, and honest launch state',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Switch to card view'}).click();await page.getByTestId('card-super-metroid').click();
 await expect(page.getByTestId('full-screen-card')).toBeVisible();
 await expect(page.getByTestId('full-screen-card').getByLabel('Super Metroid MiSTer box and screenshot artwork')).toBeVisible();
 await expect(page.getByRole('button',{name:'Launch on MiSTer, unavailable until connected'})).toBeDisabled();
 await page.getByRole('button',{name:'Read the story'}).click();await expect(page.getByRole('button',{name:'Read less'})).toBeVisible();
 await page.getByRole('button',{name:'Save for later',exact:true}).click();await expect(page.getByRole('button',{name:'Remove from saved games'})).toBeVisible();
 await page.getByRole('button',{name:'Close full-screen card'}).click();
 await page.reload();await page.getByRole('button',{name:'Show saved games'}).click();await expect(page.getByTestId('row-super-metroid')).toBeVisible();await page.getByRole('button',{name:'Switch to card view'}).click();await expect(page.getByTestId('card-super-metroid')).toBeVisible();await expect(page.getByTestId('card-sonic-2')).toHaveCount(0);
 await page.getByTestId('card-super-metroid').click();await page.getByRole('button',{name:'Remove from saved games'}).click();await page.getByRole('button',{name:'Back to library'}).click();await expect(page.getByText('A little room for favourites.')).toBeVisible();
});
test('sort, modern card and connection information',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Switch to card view'}).click();await page.getByRole('button',{name:'Sort collection'}).click();await page.getByRole('radio',{name:'Newest releases first'}).click();
 await expect(page.locator('[data-testid^="card-"]').first()).toHaveAttribute('data-testid','card-turrican-collection');
 await page.getByTestId('card-turrican-collection').click();await expect(page.getByText('NEW EDITION')).toBeVisible();
 await page.getByRole('button',{name:'Why launching is unavailable'}).click();await expect(page.getByText('Not connected',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Close panel',exact:true}).click();await page.keyboard.press('Escape');await expect(page.getByTestId('full-screen-card')).toHaveCount(0);
});
test('playlists can be created, filled, ordered, and reached from a game card',async({page})=>{
 await page.goto('/');await page.evaluate(()=>localStorage.clear());await page.reload();
 await page.getByRole('button',{name:'Playlists'}).click();await expect(page.getByText('Make your first mixtape.')).toBeVisible();
 await page.getByRole('button',{name:'Create a new playlist'}).click();await page.getByRole('textbox',{name:'Playlist name'}).fill('Sunday set');await page.getByRole('button',{name:'Create playlist'}).click();
 await expect(page.getByText('Sunday set',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Add games to this playlist'}).click();await page.getByRole('textbox',{name:'Search games to add'}).fill('Metroid');
 await page.getByRole('checkbox',{name:'Add Super Metroid to Sunday set'}).click();await expect(page.getByRole('checkbox',{name:'Remove Super Metroid from Sunday set'})).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.getByText('Super Metroid',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Move Super Metroid earlier'})).toHaveAttribute('aria-disabled','true');
 await page.getByRole('button',{name:'Library'}).click();await page.getByRole('button',{name:'Switch to card view'}).click();await page.getByTestId('card-sonic-2').click();await page.getByRole('button',{name:'Add game to a playlist'}).click();await page.getByRole('checkbox',{name:'Sunday set'}).click();await page.getByRole('button',{name:'Done'}).click();
 await page.getByRole('button',{name:'Playlists'}).click();await page.getByRole('button',{name:'Open playlist Sunday set'}).click();await expect(page.getByText('Sonic The Hedgehog 2',{exact:true})).toBeVisible();
});
test('discover explains recommendations from a chosen game',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Switch to card view'}).click();await page.getByTestId('card-super-metroid').click();await page.getByRole('button',{name:'Find games like this'}).click();
 await expect(page.getByRole('button',{name:'Discover'})).toBeVisible();await expect(page.getByText('Because you chose Super Metroid.')).toBeVisible();
 await expect(page.getByRole('button',{name:'Open recommendation Super Turrican',exact:true})).toBeVisible();await page.getByRole('button',{name:'Open recommendation Super Turrican',exact:true}).click();await expect(page.getByTestId('full-screen-card')).toBeVisible();
});
test('screenshots, loaded artwork and no runtime errors at phone and desktop sizes',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 for(const [width,height] of [[390,844],[360,740],[1280,1000]]){
  await page.setViewportSize({width,height});await page.goto('/');await expect(page.getByTestId('row-super-metroid')).toBeVisible();await page.getByRole('button',{name:'Switch to card view'}).click();await expect(page.getByTestId('card-super-metroid')).toBeVisible();await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`../screenshots/library-${width}.png`});await page.getByTestId('card-super-metroid').click();await expect(page.getByTestId('full-screen-card')).toBeVisible();
  await page.waitForTimeout(300);await expect(page.getByRole('button',{name:'Save for later',exact:true})).toBeInViewport();
  await page.screenshot({path:`../screenshots/full-card-${width}.png`});
 }
 expect(errors).toEqual([]);
});
