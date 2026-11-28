#!/bin/bash
set -e
cd /home/user/Playground_01/ads/src
OUT=../video
enc="-c:v libx264 -preset medium -crf 24 -pix_fmt yuv420p -r 30 -an"
fade(){ # in out dur
 echo "fade=t=in:st=0:d=0.3,fade=t=out:st=$(echo "$1-0.3"|bc):d=0.3"; }
for l in ko en ja; do
 for o in v h; do
  if [ $o = v ]; then W=1080;H=1920;CAP=cap_m_$l.png;DIST=6200; else W=1920;H=1080;CAP=cap_d_$l.png;DIST=2300; fi
  T=/tmp/seg_${l}_$o; mkdir -p $T
  seg(){ ffmpeg -loglevel error -y -loop 1 -framerate 30 -t $2 -i card_${l}_${o}_$1.png -vf "$3" $enc $T/$1.mp4; }
  seg intro 2 "fade=t=in:st=0:d=0.3,fade=t=out:st=1.7:d=0.3"
  seg cap1 1.5 "fade=t=in:st=0:d=0.25,fade=t=out:st=1.25:d=0.25"
  seg cap2 1.5 "fade=t=in:st=0:d=0.25,fade=t=out:st=1.25:d=0.25"
  seg end 3 "fade=t=in:st=0:d=0.3,fade=t=out:st=2.7:d=0.3"
  ffmpeg -loglevel error -y -loop 1 -framerate 30 -t 7 -i $CAP -vf "crop=$W:$H:0:'$DIST*(3*pow(t/7\,2)-2*pow(t/7\,3))',fade=t=in:st=0:d=0.3,fade=t=out:st=6.7:d=0.3" $enc $T/scroll.mp4
  printf "file 'intro.mp4'\nfile 'scroll.mp4'\nfile 'cap1.mp4'\nfile 'cap2.mp4'\nfile 'end.mp4'\n" > $T/list.txt
  name=dailydrop_${l}_$([ $o = v ] && echo 1080x1920 || echo 1920x1080)_15s.mp4
  ffmpeg -loglevel error -y -f concat -i $T/list.txt -c copy -movflags +faststart $OUT/$name
 done
done
