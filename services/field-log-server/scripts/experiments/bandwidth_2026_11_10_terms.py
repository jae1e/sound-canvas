"""Key-term misses per condition for bandwidth_2026_11_10.py.  Usage: python -I this.py OUTDIR/results.json"""
import json, re, sys
from collections import defaultdict
T = {
 "s1": ["3번|삼번|삼 번","라인","컨베이어","점검","완료","베어링|bearing","교체","내일","오전","9시|아홉 ?시","진행","김민수","대리"],
 "s2": ["압력","2\\.5|이점오","bar|바\\b|바,","온도","섭씨","78도|칠십팔 ?도","진동","4\\.2|사점이","mm/s|밀리미터 ?/ ?(초|세컨드|퍼세컨드|퍼 세컨드|퍼셀컨드)|mm/sec","기준치","15 ?%|15퍼센트|십오 ?퍼센트","높습니다"],
 "s3": ["two","leaking","outlet valve","shut it down","night shift","\\blog\\b","work order"],
 "s4": ["순찰","첫째","프레스","A ?구역|에이 ?구역","안전 ?펜스","열려","닫았","둘째","지게차","통로","팔레트","세 ?개","방치","물류 ?팀","셋째","compressor|컴프레서","환기팬","소음","maintenance|메인터넌스|메인터너스","요청","TBM","보호안경","착용","강조"],
}
d = json.load(open(sys.argv[1]))
agg = defaultdict(lambda: [0, 0, []])
for r in d["rows"]:
    key = (r["source"], r["band"], "none" if r["snr"] is None else f'{r["snr"]} dB')
    for t in T[r["sentence"]]:
        agg[key][1] += 1
        if not re.search(t, r["hyp"], re.I):
            agg[key][0] += 1; agg[key][2].append(f'{r["sentence"]}:{t.split("|")[0]}')
for k, (miss, n, which) in agg.items():
    print(f"{k[0]:13s} {k[1]:13s} {k[2]:6s} missed {miss:2d}/{n}  {' '.join(which)}")
