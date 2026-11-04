import type { Lang, LandmarkFact } from '@vlc/travel';

/**
 * Sample landmarks near Gwanghwamun, Seoul, for fixture mode. The descriptions are original text written for this app
 * (not copied from any provider) and kept to well-known facts. They exist so the voice flow can be tested without keys.
 */
export type LandmarkFixture = {
  key: string;
  lat: number;
  lng: number;
  name: Record<Lang, string>;
  category: Record<Lang, string>;
  overview: Record<Lang, string>;
  facts: Partial<Record<Lang, LandmarkFact[]>>;
};

/** Reference point of the fixture layout. */
export const GWANGHWAMUN = { lat: 37.5759, lng: 126.9769 };

export const LANDMARK_FIXTURES: LandmarkFixture[] = [
  {
    key: 'gyeongbokgung',
    lat: 37.5796,
    lng: 126.977,
    name: { ko: '경복궁', en: 'Gyeongbokgung Palace' },
    category: { ko: '궁궐', en: 'Palace' },
    overview: {
      ko:
        '경복궁은 서울 도심 북쪽에 있는 조선 시대의 대표 궁궐이에요. 1395년에 태조가 새 도읍에 처음 지었어요. ' +
        '궁궐의 정문인 광화문을 지나면 왕이 신하를 만나던 근정전이 나와요. 임진왜란 때 대부분의 건물이 불에 타서 오랫동안 비어 있었어요. ' +
        '1867년에 고종 때 다시 지으면서 다시 조선의 중심 궁궐이 되었어요. 연못 위에 서 있는 경회루는 나라의 큰 잔치를 열던 누각이에요. ' +
        '지금도 궁궐 문 앞에서는 문을 지키던 군사의 교대 의식을 재현해요.',
      en:
        'Gyeongbokgung is the main royal palace of the Joseon dynasty, in the north of central Seoul. King Taejo had it built in 1395 for the new capital. ' +
        'Past its main gate, Gwanghwamun, you reach Geunjeongjeon, the hall where the king met his officials. Most buildings burned down during the Japanese invasions of the 1590s, and the site stood mostly empty for a long time. ' +
        'It was rebuilt in 1867 under King Gojong and became the center of the dynasty again. Gyeonghoeru, a large pavilion on a pond, was used for big state banquets. ' +
        'Today the changing of the gate guards is reenacted in front of the palace.',
    },
    facts: {
      ko: [{ key: 'closed', value: '화요일은 쉬어요' }],
      en: [{ key: 'closed', value: 'Closed on Tuesdays' }],
    },
  },
  {
    key: 'deoksugung',
    lat: 37.5658,
    lng: 126.9751,
    name: { ko: '덕수궁', en: 'Deoksugung Palace' },
    category: { ko: '궁궐', en: 'Palace' },
    overview: {
      ko:
        '덕수궁은 시청 앞 광장 바로 옆에 있는 작은 궁궐이에요. 고종이 1897년에 이곳으로 옮겨 와 대한제국을 선포했어요. ' +
        '한옥 건물 사이에 서양식 석조전이 서 있어서 전통과 근대가 함께 보여요. 석조전은 1910년에 완성되었어요. ' +
        '고종이 왕위를 넘긴 1907년에 덕수궁이라는 이름이 붙었어요. 궁 담장을 따라 걷는 돌담길은 서울에서 산책하기 좋은 길로 손꼽혀요. ' +
        '대한문 앞에서는 문을 지키던 군사의 교대 의식을 볼 수 있어요.',
      en:
        'Deoksugung is a small palace right next to the City Hall plaza. King Gojong moved here in 1897 and proclaimed the Korean Empire. ' +
        'Western-style stone buildings stand among traditional wooden halls, so you see old Korea and the modern era side by side. The stone hall, Seokjojeon, was completed in 1910. ' +
        'The palace got the name Deoksugung in 1907, when Gojong handed over the throne. The stone-wall road along its outer wall is a well-known walking route in Seoul. ' +
        'In front of Daehanmun gate you can watch the changing of the guards.',
    },
    facts: {
      ko: [{ key: 'closed', value: '월요일은 쉬어요' }],
      en: [{ key: 'closed', value: 'Closed on Mondays' }],
    },
  },
  {
    key: 'jogyesa',
    lat: 37.5733,
    lng: 126.9796,
    name: { ko: '조계사', en: 'Jogyesa Temple' },
    category: { ko: '사찰', en: 'Temple' },
    overview: {
      ko:
        '조계사는 서울 종로 한가운데에 있는 절이에요. 한국 불교에서 가장 큰 종단인 조계종의 총본산이에요. ' +
        '지금의 대웅전은 1938년에 지은 건물이에요. 마당에는 오래된 백송이 있는데 천연기념물로 지정되어 있어요. ' +
        '부처님오신날 즈음에는 알록달록한 연등이 경내를 가득 채워요. 높은 건물 사이에 있어도 안으로 들어가면 조용한 분위기예요.',
      en:
        'Jogyesa is a temple in the middle of Jongno in Seoul. It is the head temple of the Jogye Order, the largest order of Korean Buddhism. ' +
        'The present main hall, Daeungjeon, was built in 1938. An old white-barked pine in the courtyard is designated a natural monument. ' +
        'Around Buddha\'s Birthday, colorful lanterns fill the grounds. Even between tall buildings, the inside feels calm.',
    },
    facts: {},
  },
  {
    key: 'bosingak',
    lat: 37.5703,
    lng: 126.982,
    name: { ko: '보신각', en: 'Bosingak Belfry' },
    category: { ko: '누각', en: 'Pavilion' },
    overview: {
      ko:
        '보신각은 종로 네거리에 있는 종각이에요. 안에는 큰 종이 걸려 있어요. 조선 시대에는 이 종을 쳐서 성문을 열고 닫는 시간을 알렸어요. ' +
        '지금의 건물은 1979년에 다시 지었고, 종은 1985년에 새로 만들었어요. 해마다 12월 31일 자정에는 새해를 알리는 타종 행사가 열려요. ' +
        '수많은 시민이 모여 함께 종소리를 들어요.',
      en:
        'Bosingak is a bell pavilion at the Jongno crossroads, with a large bell hanging inside. In the Joseon era the bell was rung to tell people when the city gates opened and closed. ' +
        'The current building was rebuilt in 1979, and the bell was newly cast in 1985. Every year at midnight on December 31, a bell-ringing ceremony welcomes the new year. ' +
        'Crowds gather to hear it together.',
    },
    facts: {},
  },
  {
    key: 'cheonggyecheon',
    lat: 37.5693,
    lng: 126.9784,
    name: { ko: '청계천', en: 'Cheonggyecheon Stream' },
    category: { ko: '하천', en: 'Stream' },
    overview: {
      ko:
        '청계천은 서울 도심을 동서로 가로지르는 하천이에요. 길이는 약 10.9킬로미터예요. 조선 시대에는 영조 때 물길을 정비한 기록이 전해져요. ' +
        '한동안 하천 위를 덮고 도로와 고가도로를 만들었어요. 2003년부터 2005년까지 고가도로를 걷어내고 하천을 다시 열었어요. ' +
        '지금은 시민들이 걷고 쉬는 도심 속 산책로가 되었어요.',
      en:
        'Cheonggyecheon is a stream that runs east to west through downtown Seoul, about 10.9 kilometers long. Records say the channel was improved under King Yeongjo in the Joseon era. ' +
        'For a long time the stream was covered over by a road and an elevated highway. From 2003 to 2005 the highway was removed and the stream was opened up again. ' +
        'Today it is a walking path in the city where people stroll and rest.',
    },
    facts: {},
  },
];
