# 테스트 (앱과 별개)

`index.html`의 계산이 맞는지 확인하는 테스트예요. 앱 동작과는 상관없고, 지워도 앱은 그대로 돌아요.
규칙과 확인할 불변식은 저장소의 `CLAUDE.md` 7장에 있어요.

## 돌리는 법

```bash
cd tests
npm install        # jsdom 설치 (처음 한 번)
./run.sh           # 전부 돌리기 (10분쯤). 결과 자세한 내용은 tests/out/
./syn.sh           # 문법 검사만
node t/skip.js     # 묶음 하나만
```

다른 파일을 검사하려면 `FC_HTML=/경로/파일.html ./run.sh`처럼 써요.

## 구성

| 위치 | 내용 |
|---|---|
| `t/h.js` | 하네스. jsdom으로 앱을 띄우고 가짜 시계로 하루씩 넘기며 실제 버튼을 눌러요 |
| `t/seed.js` | 테스트용 목표들 (강의·양·난이도·페이지, 마감일 기준·하루 가능 시간 기준, 개수 기준) |
| `t/lib.js` | 공통 도구: 불변식 검사(`inv`), 계획대로 따라가기(`follow`) |
| `t/baseline.js`, `t/baseline2.js` | 새 기능을 안 쓰는 목표가 v4.7과 똑같이 계산되는지 비교하는 시나리오 (`baseline/`의 v4.7 결과와 비교) |
| `t/ext*.js` | 따로 할 것(복습 추가) |
| `t/skip*.js`, `t/skipcur*.js` | 챕터 건너뛰기 |
| `t/yday*.js` | 어제 체크, "안 했어요" |
| `t/pin*.js` | 오늘·내일 양 정하기 |
| `r/` | 독립 재검토에서 만든 스크립트. `f_fuzz2.js`(복습 무작위), `s_fuzz.js`(건너뛰기 무작위), `o_twins.js`·`yd_twins.js`(쌍둥이 비교)가 핵심이고, 나머지는 그때그때 찾은 버그의 재현 스크립트예요 |
| `baseline/` | v4.7이 낸 결과(압축). 바꾸지 않아요 |

## 새 기준 결과를 만들 때

계산을 일부러 바꾼 게 아니라면 `baseline/`은 건드리지 않아요. 예전 버전 파일이 필요하면 git에서 꺼내요.

```bash
git show <커밋>:index.html > out/old.html
node t/baseline.js out/old.html > out/old.json
```
