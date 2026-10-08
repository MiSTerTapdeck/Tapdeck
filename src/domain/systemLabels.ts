// Display names only: stored system names remain the keys for filtering and artwork.
const consoleCompanies:Record<string,string>={
 jaguarcd:'Atari',atarijaguarcd:'Atari',genesis32x:'SEGA',megadrive32x:'SEGA',
 nes:'Nintendo',famicom:'Nintendo',fds:'Nintendo',famicomdisksystem:'Nintendo',nintendoentertainmentsystem:'Nintendo',
 snes:'Nintendo',supernintendo:'Nintendo',supernintendoentertainmentsystem:'Nintendo',superfamicom:'Nintendo',n64:'Nintendo',nintendo64:'Nintendo',
 gameboy:'Nintendo',gameboycolor:'Nintendo',gameboyadvance:'Nintendo',gba:'Nintendo',gbc:'Nintendo',gb:'Nintendo',virtualboy:'Nintendo',pokemonmini:'Nintendo',gamewatch:'Nintendo',gameandwatch:'Nintendo',
 sg1000:'SEGA',mastersystem:'SEGA',megadrive:'SEGA',genesis:'SEGA',megacd:'SEGA',segacd:'SEGA','32x':'SEGA',sega32x:'SEGA',gamegear:'SEGA',saturn:'SEGA',dreamcast:'SEGA',
 playstation:'Sony',psx:'Sony',ps1:'Sony',psp:'Sony',playstationportable:'Sony',
 atari2600:'Atari',atari5200:'Atari',atari7800:'Atari',lynx:'Atari',atarilynx:'Atari',jaguar:'Atari',atarijaguar:'Atari',
 pcengine:'NEC',pce:'NEC',turbografx16:'NEC',turbografx:'NEC',pcenginecd:'NEC',pcecd:'NEC',turbografx16cd:'NEC',turbografxcd:'NEC',supergrafx:'NEC',pcenginesupergrafx:'NEC',pcfx:'NEC',
 neogeo:'SNK',neogeoaes:'SNK',neogeomvs:'SNK',neogeocd:'SNK',neogeopocket:'SNK',neogeopocketcolor:'SNK',
 cd32:'Commodore',amigacd32:'Commodore',cdtv:'Commodore',amigacdtv:'Commodore',
 coleco:'Coleco',colecovision:'Coleco',intellivision:'Mattel',channelf:'Fairchild',odyssey:'Magnavox',odyssey2:'Magnavox',videopac:'Philips',videopacplus:'Philips',cdi:'Philips',
 wonderswan:'Bandai',wonderswancolor:'Bandai',supervision:'Watara',vectrex:'GCE',pv1000:'Casio',casiopv1000:'Casio',
 '3do':'The 3DO Company',arcadia:'Emerson',arcadia2001:'Emerson',adventurevision:'Entex',gamate:'Bit Corporation',creativision:'VTech',vc4000:'Interton',megaduck:'Creatronic',
};
const companies=[...new Set(Object.values(consoleCompanies))];
export function consoleFilterLabel(system:string):string{
 const value=system.trim();
 // Recognise existing manufacturer prefixes without repeating them.
 for(const company of companies){
  if(value.toLowerCase().startsWith(company.toLowerCase()+' ')||value.toLowerCase().startsWith(company.toLowerCase()+'-')){
   const name=value.slice(company.length).replace(/^\s*[-–—]?\s*/,'');
   return `${company} - ${name}`;
  }
 }
 const company=consoleCompanies[value.toLowerCase().replace(/[^a-z0-9]/g,'')];
 return company?`${company} - ${value}`:system;
}
