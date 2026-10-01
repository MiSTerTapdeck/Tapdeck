package main

import (
 "os"
 "path/filepath"
 "strings"
 "testing"
)

func TestUpdateRatingPreservesOtherGameData(t *testing.T){
 dir:=t.TempDir(); game:=filepath.Join(dir,"Alien Breed (1994).chd"); if err:=os.WriteFile(game,[]byte("x"),0644);err!=nil{t.Fatal(err)}
 xml:=`<?xml version="1.0"?><gameList><game id="1"><path>./Alien Breed (1994).chd</path><name>Alien Breed</name><desc>Keep this description.</desc><genre>Shooter</genre></game><game><path>./Other.chd</path><rating>0.1</rating></game></gameList>`
 list:=filepath.Join(dir,"gamelist.xml");if err:=os.WriteFile(list,[]byte(xml),0644);err!=nil{t.Fatal(err)}
 backup,err:=updateRating(list,game,85);if err!=nil{t.Fatal(err)}
 if _,err:=os.Stat(backup);err!=nil{t.Fatalf("backup missing: %v",err)}
 changed,err:=os.ReadFile(list);if err!=nil{t.Fatal(err)};text:=string(changed)
 for _,want:=range []string{"<rating>0.85</rating>","Keep this description.","<path>./Other.chd</path><rating>0.1</rating>"}{if !strings.Contains(text,want){t.Fatalf("missing %q in %s",want,text)}}
}

func TestNormaliseAndPlatforms(t *testing.T){
 if normalise("The Art of Fighting 2!")!="artoffighting2"{t.Fatal("normalise title")}
 game:=igdbGame{};game.Platforms=[]struct{Name string `json:"name"` }{{Name:"Amiga CD32"}}
 if !platformMatches(game,"Amiga CD32"){t.Fatal("expected CD32 match")}
 if platformMatches(game,"SNES"){t.Fatal("unexpected SNES match")}

 arcade:=igdbGame{};arcade.Platforms=[]struct{Name string `json:"name"` }{{Name:"Arcade"}}
 for _,system:=range []string{"CPS 1","CPS 2","CPS 3","Capcom","Irem","Jaleco","Namco","Sega","Taito","Neo Geo MVS"}{
  if !platformMatches(arcade,system){t.Fatalf("expected Arcade match for %s",system)}
 }
}
