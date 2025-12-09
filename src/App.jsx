import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css'; 

// ------------------------------------------------------
// ⚙️ 설정값
// ------------------------------------------------------
const API_BASE_URL = ""; 

// ------------------------------------------------------
// 🔥 UI 스타일 헬퍼 함수
// ------------------------------------------------------
const getScoreBadgeStyle = (score) => {
  if (score >= 80) return 'score-pill score-pill--high';
  if (score >= 40) return 'score-pill score-pill--medium';
  return 'score-pill score-pill--low';
};

// 백엔드에서 온 텍스트를 기반으로 아이콘 매핑
const getCompetitionIcon = (level) => {
  if (!level) return '⚪️';
  const s = level.toLowerCase();
  if (s.includes('매우 심함')) return '🔴';
  if (s.includes('높음')) return '🟠';
  if (s.includes('보통')) return '🟡';
  if (s.includes('낮음')) return '🟢';
  return '🟡';
};

const getAttractivenessIcon = (level) => {
  if (!level) return '❔';
  const s = level.toLowerCase();
  if (s.includes('매우 높음')) return '🔥';
  if (s.includes('높음')) return '👍';
  if (s.includes('보통')) return '✨';
  if (s.includes('낮음')) return '❄️';
  return '❔';
};

const CATEGORY_LIST = ["패션의류", "화장품/미용", "식품"];

const formatNumber = (value, decimals = 2) => {
  return Number.isFinite(value) ? value.toFixed(decimals) : null;
};

const formatDateLabel = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('ko-KR');
};

const formatTimeLabel = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
};

const extractRankingReferenceDate = (item) => {
  if (!item) return null;
  const preferredKeys = ['referenceDate', 'standardDate', 'asOf', 'snapshotDate', 'date'];
  for (const key of preferredKeys) {
    if (item[key]) return item[key];
  }
  return null;
};

// ------------------------------------------------------
// ⚠️ 주의: 이 함수들은 재계산 로직과의 충돌을 막기 위해 
// 백엔드 공식 정의를 표시하는 용도로만 사용됩니다.
// ------------------------------------------------------

// 1. 경쟁 강도 비율 (표시 목적)
const calculateCompetitionRatioDisplay = (item) => {
  const totalListings = Number(item?.totalListings ?? 0);
  const searchVolume = Number(item?.searchVolumeRatio ?? 0);
  if (!searchVolume || !totalListings) return null;
  // 기존의 상품 수 / 검색량 비율을 단순 표시용으로만 유지 (실제 레벨은 백엔드에서 옴)
  const ratio = totalListings / searchVolume; 
  return Number.isFinite(ratio) ? ratio : null;
};

// 2. 가격 요인 (재계산 필요)
const calculatePriceFactor = (item) => {
  const avgPrice = Number(item?.averagePrice ?? 0);
  if (!avgPrice || avgPrice <= 0) return null;
  return Math.log10(avgPrice);
};

// 3. 시장 매력도 점수 (재계산 필요)
const calculateAttractivenessScore = (item) => {
    // ⚠️ 이 함수는 백엔드 로직에 맞춰 정확히 재정의해야 합니다. 
    // 여기서는 백엔드가 사용하는 '경쟁 우위 점수'를 계산하여 매력도를 역추적하는 방식입니다.

    const searchVolume = Number(item?.searchVolumeRatio ?? 0);
    const totalListings = Number(item?.totalListings ?? 0);
    const priceFactor = calculatePriceFactor(item);
    
    if (!searchVolume || !totalListings || totalListings === 0 || priceFactor == null) return null;
    
    // 백엔드 로직: competitive_advantage_score = searchVolume / totalListings
    const competitiveAdvantageScore = searchVolume / totalListings;
    
    // 백엔드 로직: attractiveness_score = competitiveAdvantageScore * 100000 * priceFactor
    const score = competitiveAdvantageScore * 100000 * priceFactor;
    
    return Number.isFinite(score) ? score : null;
};

// 4. 소싱 점수 (재계산 필요)
const calculateSourcingScoreLocal = (item) => {
  const searchVolume = Number(item?.searchVolumeRatio ?? 0);
  const attractivenessScore = calculateAttractivenessScore(item);
  
  if (!searchVolume && attractivenessScore == null) return null;
  
  // 백엔드 로직: sourcing_score = min(100, (avg_search_ratio * 0.5) + (attractiveness_score * 0.05))
  const raw = (searchVolume * 0.5) + ((attractivenessScore ?? 0) * 0.05);
  
  return Math.min(100, raw);
};


// ------------------------------------------------------
// 🔥 Notification 컴포넌트
// ------------------------------------------------------
const Notification = ({ severity, message }) => (
    <p className={`notification notification--${severity}`}>
      {message}
    </p>
);


// ------------------------------------------------------
// 🔥 메인 컴포넌트
// ------------------------------------------------------
function App() {
  const [keyword, setKeyword] = useState('');
  const [dataList, setDataList] = useState([]);
  const [rankingList, setRankingList] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORY_LIST[0] ?? '');
  const [loading, setLoading] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null); 
  const [selectedRankingKeyword, setSelectedRankingKeyword] = useState('');
  const [notification, setNotification] = useState(null);
  const [rankingReferenceDate, setRankingReferenceDate] = useState(null);
  const [rankingLastFetchedAt, setRankingLastFetchedAt] = useState(null);
  
  const showNotification = (severity, message) => {
    setNotification({ severity, message });
  };

  // -----------------------------
  // 🔥 우측 목록 조회 (market/list)
  // -----------------------------
  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/market/list`); 
      const data = Array.isArray(res.data) ? res.data : [];
      setDataList(data);
      if (!selectedAnalysis && data.length > 0) {
        setSelectedAnalysis(data[0]); 
      }
    } catch (err) {
      console.error("데이터 조회 실패:", err);
    }
  }, [selectedAnalysis]); 

  // -----------------------------
  // 🔥 좌측 랭킹 조회 (market/ranking)
  // -----------------------------
  const fetchRanking = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/market/ranking`);
      const list = Array.isArray(res.data) ? res.data : [];
      setRankingList(list);
      setRankingReferenceDate(extractRankingReferenceDate(list[0]));
      setRankingLastFetchedAt(new Date().toISOString());
    } catch (err) {
      console.error("랭킹 조회 실패:", err);
    }
  }, []);

  // -----------------------------
  // 🔥 키워드 분석 요청 (market/sourcing/request)
  // -----------------------------
  const handleSearch = async () => {
    if (!keyword.trim()) {
      showNotification("warning", "키워드를 입력해주세요!");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/market/sourcing/request?keyword=${keyword}`);
      showNotification("success", `'${keyword}' 분석 요청이 접수되었습니다.`);
      setKeyword('');
      setTimeout(fetchData, 1000); 
    } catch (err) {
      console.error("요청 실패:", err);
      showNotification("error", "SQS 전송 오류! (백엔드 확인 필요)");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // 🔥 초기 데이터 로딩 및 인터벌 설정
  // -----------------------------
  useEffect(() => {
    fetchData();
    fetchRanking();
    const intervalId = setInterval(() => {
      fetchData();
      fetchRanking();
    }, 2000); 
    return () => clearInterval(intervalId);
  }, [fetchData, fetchRanking]); 

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 3200);
    return () => clearTimeout(timer);
  }, [notification]);

  // -----------------------------
  // 🔥 좌측 카테고리 필터링된 랭킹
  // -----------------------------
  const filteredRanking = Array.isArray(rankingList) ? rankingList.filter(item => {
    if (!selectedCategory) return true;
    return item.keyword.startsWith(`[${selectedCategory}]`);
  }) : []; 

  // ------------------------------------------------------
  // 🔥 랭킹 테이블 렌더링
  // ------------------------------------------------------
  const normalizeValue = (text) => {
    return text
      ?.replace(/\[.*?\]/g, '') 
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  };

  const renderRankingTable = (list) => (
    <table className="data-table ranking-table" style={{ width: '100%' }}>
      <thead>
        <tr className="table-header-row">
          <th>순위</th>
          <th>상품명</th>
        </tr>
      </thead>
      <tbody>
        {!(Array.isArray(list) && list.length > 0) ? (
          <tr>
            <td colSpan="2" className="table-data-empty">
              데이터 없음
            </td>
          </tr>
        ) : (
          list.map((item, index) => (
            <tr
              key={`${selectedCategory}-${index}-${item.keyword}`}
              className="ranking-row"
              onClick={() => {
                const normalized = normalizeValue(item.keyword);
                setSelectedRankingKeyword(item.keyword);
                const analysisItem = dataList.find(d => normalizeValue(d.searchKeyword) === normalized);
                setSelectedAnalysis(analysisItem || null);
              }}
            >
              <td><strong>{index + 1}위</strong></td>
              <td>{item.keyword}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  const renderFormulaPanel = (item) => {
    // ⚠️ 백엔드에서 받은 최종 레벨 및 점수를 신뢰합니다.
    const competitionRatio = calculateCompetitionRatioDisplay(item); // 단순 비율 계산 (표시용)
    const priceFactor = calculatePriceFactor(item); // 로그 계산 (표시용)
    const attractivenessScore = calculateAttractivenessScore(item); // 매력도 점수 역추적
    const sourcingScore = calculateSourcingScoreLocal(item); // 소싱 점수 역추적

    const competitionRatioDisplay = formatNumber(competitionRatio, 2);
    const priceFactorDisplay = formatNumber(priceFactor, 2);
    const attractivenessDisplay = formatNumber(attractivenessScore, 1);
    const sourcingDisplay = formatNumber(sourcingScore, 1);
    const searchVolume = Number(item?.searchVolumeRatio ?? 0);

    return (
      <div className="formula-panel">
        <h4>지표 계산 공식 (백엔드 로직 기반)</h4>
        
        {/* 1. 경쟁 강도 비율 (표시용) */}
        <div className="formula-block">
          <p className="formula-label">
            경쟁 강도 비율 (Competition Ratio) = 총 상품 수 ÷ 월간 검색 지수
          </p>
          <p>
            {item.totalListings?.toLocaleString() ?? 'N/A'} ÷ {item.searchVolumeRatio ?? 'N/A'} = **{competitionRatioDisplay ?? '계산 불가'}** ({item.competitionLevel})
          </p>
        </div>
        
        {/* 2. 가격 요인 */}
        <div className="formula-block">
          <p className="formula-label">
            가격 요인 (Price Factor) = log₁₀(평균 가격)
          </p>
          <p>**{priceFactorDisplay ?? '계산 불가'}**</p>
        </div>
        
        {/* 3. 시장 매력도 점수 */}
        <div className="formula-block">
          <p className="formula-label">
            시장 매력도 점수 = (월간 검색 지수 ÷ 상품 수) * 100000 * 가격 요인
          </p>
          <p>
            {searchVolume} ÷ {item.totalListings?.toLocaleString() ?? '-'} * 100000 * {priceFactorDisplay ?? '-'} = **{attractivenessDisplay ?? '계산 불가'}** ({item.marketAttractiveness})
          </p>
        </div>
        
        {/* 4. 소싱 점수 */}
        <div className="formula-block">
          <p className="formula-label">
            소싱 점수 = min(100, (월간 검색 지수 × 0.5) + (매력도 점수 × 0.05))
          </p>
          <p>
            {searchVolume} × 0.5 + {attractivenessDisplay ?? '-'} × 0.05 = **{sourcingDisplay ?? '계산 불가'}** (DB 저장 값: {item.sourcingScore})
          </p>
        </div>
      </div>
    );
  };

  // ------------------------------------------------------
  // 🔥 우측 상세 테이블 렌더링
  // ------------------------------------------------------
  const renderAnalysisDetail = (item) => {
    if (!item) {
        return (
          <p className="detail-placeholder">
            {selectedRankingKeyword
              ? `'${normalizeValue(selectedRankingKeyword)}' 키워드에 대한 분석을 아직 불러오지 못했습니다. 목록에서 동일 키워드를 요청하거나 분석 요청 후 확인해주세요.`
              : '좌측 랭킹 목록에서 항목을 선택하거나, 분석 목록을 확인해주세요.'
            }
          </p>
        );
    }
    
    return (
        <>
        <table className="data-table detail-table" style={{ width: '100%' }}>
            <thead>
                <tr>
                    <th colSpan="2">ID: {item.id} / 키워드: {item.searchKeyword}</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>소싱 점수</td>
                    <td><span className={getScoreBadgeStyle(item.sourcingScore)}>{item.sourcingScore}</span></td>
                </tr>
                <tr>
                    <td>카테고리</td>
                    <td>{item.category}</td>
                </tr>
                <tr>
                    <td>총 상품 수</td>
                    <td>{item.totalListings?.toLocaleString()}</td>
                </tr>
                <tr>
                    <td>경쟁 강도</td>
                    <td>{getCompetitionIcon(item.competitionLevel)} {item.competitionLevel}</td>
                </tr>
                <tr>
                    <td>매력도</td>
                    <td>{getAttractivenessIcon(item.marketAttractiveness)} {item.marketAttractiveness}</td>
                </tr>
                <tr>
                    <td>평균 가격</td>
                    <td>{item.averagePrice?.toLocaleString()}원</td>
                </tr>
                <tr>
                    <td>최저가</td>
                    <td style={{color: '#ff6b6b'}}>{item.lowestPrice?.toLocaleString()}원</td>
                </tr>
                <tr>
                    <td>1등 상품명</td>
                    <td>{item.topItemName}</td>
                </tr>
            </tbody>
        </table>
        {renderFormulaPanel(item)}
        </>
    );
  };

  const rankingDateLabel = formatDateLabel(rankingReferenceDate) ?? formatDateLabel(rankingLastFetchedAt) ?? '알 수 없음';
  const rankingUpdateTimeLabel = formatTimeLabel(rankingLastFetchedAt) ?? '알 수 없음';

  // ------------------------------------------------------
  // 🔥 UI 출력 (CSS 클래스 적용)
  // ------------------------------------------------------
  return (
    <div className="App">
      <h1>🛒 스마트 소싱 분석 대시보드</h1>

      {/* 검색 입력 */}
      <div className="search-container">
        <h3 className="search-title">새로운 키워드 분석 요청</h3>
        <input
          type="text"
          placeholder="예: 전기담요, 원터치텐트..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="search-input"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="search-button"
        >
          {loading ? "전송 중..." : "분석 요청 🚀"}
        </button>
        {notification && (
          <Notification severity={notification.severity} message={notification.message} />
        )}
      </div>

      {/* 좌측 랭킹 + 우측 상세 분석 */}
      <div className="main-layout-container">
        {/* 좌측: 카테고리 랭킹 */}
        <div className="panel-container left-panel">
          <h3 className="panel-title">🔥 네이버 쇼핑 카테고리 TOP10</h3>
          <p className="panel-subtitle">
            카테고리 TOP10 · 기준일: {rankingDateLabel} · 업데이트: {rankingUpdateTimeLabel}
          </p>

          {/* 🔥 카테고리 버튼 */}
          <div className="category-buttons-container">
            {CATEGORY_LIST.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`category-button ${selectedCategory === cat ? 'active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 🔥 선택된 카테고리 랭킹 */}
          {renderRankingTable(filteredRanking)}
        </div>

        {/* 우측: 상세 분석 */}
        <div className="panel-container right-panel">
          <h3 className="panel-title">📊 상세 분석 결과</h3>
          {renderAnalysisDetail(selectedAnalysis)}
        </div>
      </div>
    </div>
  );
}

export default App;
