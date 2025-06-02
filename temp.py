import pandas as pd

# 1) CSV 파일 로드
csv_path = r'C:\Users\nazny\OneDrive\Desktop\infovis\infovis\data\ufo_us.csv'
df = pd.read_csv(csv_path, encoding='utf-8')

# 2) 약어 → 전체 주 이름 매핑 딕셔너리 (소문자 키 기준)
state_map = {
    'al': 'Alabama',           'ak': 'Alaska',
    'az': 'Arizona',           'ar': 'Arkansas',
    'ca': 'California',        'co': 'Colorado',
    'ct': 'Connecticut',       'de': 'Delaware',
    'dc': 'District of Columbia','fl': 'Florida',
    'ga': 'Georgia',           'hi': 'Hawaii',
    'ia': 'Iowa',              'id': 'Idaho',
    'il': 'Illinois',          'in': 'Indiana',
    'ks': 'Kansas',            'ky': 'Kentucky',
    'la': 'Louisiana',         'ma': 'Massachusetts',
    'md': 'Maryland',          'me': 'Maine',
    'mi': 'Michigan',          'mn': 'Minnesota',
    'mo': 'Missouri',          'ms': 'Mississippi',
    'mt': 'Montana',           'nc': 'North Carolina',
    'nd': 'North Dakota',      'ne': 'Nebraska',
    'nh': 'New Hampshire',     'nj': 'New Jersey',
    'nm': 'New Mexico',        'nv': 'Nevada',
    'ny': 'New York',          'oh': 'Ohio',
    'ok': 'Oklahoma',          'or': 'Oregon',
    'pa': 'Pennsylvania',      'pr': 'Puerto Rico',
    'ri': 'Rhode Island',      'sc': 'South Carolina',
    'sd': 'South Dakota',      'tn': 'Tennessee',
    'tx': 'Texas',             'ut': 'Utah',
    'va': 'Virginia',          'vt': 'Vermont',
    'wa': 'Washington',        'wi': 'Wisconsin',
    'wv': 'West Virginia',     'wy': 'Wyoming'
}

# 3) 매핑 적용 (원래 'state' 칼럼을 전체 이름으로 덮어씁니다)
df['state'] = (
    df['state']
      .str.lower()       # 소문자로 통일
      .map(state_map)    # 전체 이름으로 변환
      .fillna(df['state'])  # 매핑되지 않으면 원래 값 유지
)

# 4) 결과를 CSV로 저장
# (a) 원본 덮어쓰기
df.to_csv(csv_path, index=False, encoding='utf-8-sig')

# (b) 새 파일로 저장하려면 아래를 사용하세요
# output_path = r'C:\Users\nazny\OneDrive\Desktop\infovis\infovis\data\ufo_us_fullstate.csv'
# df.to_csv(output_path, index=False, encoding='utf-8-sig')
