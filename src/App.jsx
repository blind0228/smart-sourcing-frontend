import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css'; 

// ------------------------------------------------------
// ⚙️ 설정값
// ------------------------------------------------------
// 🔥 백엔드 주소: Vite 개발 환경에서 Proxy를 사용하기 위해 빈 문자열로 설정합니다.
// (배포 시에는 .env 파일 등을 통해 전체 ALB 주소를 넣어줘야 합니다.)
const API_BASE_URL = ""; 

// ------------------------------------------------------
// 🔥 UI 스타일 헬퍼 함수
// ------------------------------------------------------
const getScoreBadgeStyle = (score) => {
  if (score >= 80) return 'score-pill score-pill--high';
  if (score >= 40) return 'score-pill score-pill--medium';
  return 'score-pill score-pill--low';
};

const getCompetitionIcon = (level) => {
  if (!level) return '⚪️';
  const s = level.toLowerCase();
  if (s.includes('낮')) return '🟢';
  if (s.includes('높') || s.includes('심함')) return '🔴';
  return '🟡';
};

const getAttractivenessIcon = (level) => {
  if (!level) return '❔';
  const s = level.toLowerCase();
  if (s.includes('매우 높음')) return '🔥';
  if (s.includes('높음')) return '👍';
  return '❄️';
};

const CATEGORY_LIST = ["패션의류", "화장품/미용", "식품"];

// ------------------------------------------------------
// 🔥 메인 컴포넌트
// ------------------------------------------------------
function App() {
  const [keyword, setKeyword] = useState('');
  const [dataList, setDataList] = useState([]);
  const [rankingList, setRankingList] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORY_LIST[0]);
  const [loading, setLoading] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null); // 우측 상세 분석을 위한 상태

  // -----------------------------
  // 🔥 우측 목록 조회 (market/list)
  // -----------------------------
  const fetchData = async () => {
    try {
      // API_BASE_URL은 빈 문자열이므로, 요청은 /api/market/list로 전달됨
      const res = await axios.get(`${API_BASE_URL}/api/market/list`); 
      setDataList(Array.isArray(res.data) ? res.data : []);
      // 데이터 로드 후 가장 최근 데이터 선택 (옵션)
      if (res.data && res.data.length > 0) {
        setSelectedAnalysis(res.data[0]); 
      }
    } catch (err) {
      console.error("데이터 조회 실패:", err);
      setDataList([]); 
    }
  };

  // -----------------------------
  // 🔥 좌측 랭킹 조회 (market/ranking)
  // -----------------------------
  const fetchRanking = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/market/ranking`);
      setRankingList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("랭킹 조회 실패:", err);
      setRankingList([]); 
    }
  };

  // -----------------------------
  // 🔥 키워드 분석 요청 (market/sourcing/request)
  // -----------------------------
  const handleSearch = async () => {
    if (!keyword.trim()) {
      alert("키워드를 입력해주세요!");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/market/sourcing/request?keyword=${keyword}`);
      alert(`'${keyword}' 분석 요청이 접수되었습니다!`);
      setKeyword('');
      // 요청 후 목록을 다시 로드하여 새 요청이 반영되도록 함
      fetchData(); 
    } catch (err) {
      console.error("요청 실패:", err);
      alert("SQS 전송 오류! (백엔드 확인 필요)");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // 🔥 초기 데이터 로딩
  // -----------------------------
  useEffect(() => {
    fetchData();
    fetchRanking();
  }, []);

  // -----------------------------
  // 🔥 좌측 카테고리 필터링된 랭킹
  // -----------------------------
  const filteredRanking = Array.isArray(rankingList) ? rankingList.filter(item => (
    item.keyword.startsWith(`[${selectedCategory}]`)
  )) : []; 

  // ------------------------------------------------------
  // 🔥 랭킹 테이블 렌더링
  // ------------------------------------------------------
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
            <td colSpan="2" style={{ textAlign: "center", padding: "20px" }}>
              데이터 없음
            </td>
          </tr>
        ) : (
          list.map((item, index) => (
            <tr
              key={`${selectedCategory}-${index}-${item.keyword}`}
              className="ranking-row"
              onClick={() => {
                const analysisItem = dataList.find(d => d.searchKeyword === item.keyword.replace(/\[.*?\]\s*/, ''));
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

  // ------------------------------------------------------
  // 🔥 우측 상세 테이블 렌더링
  // ------------------------------------------------------
  const renderAnalysisDetail = (item) => {
    if (!item) {
        return <p className="detail-placeholder">좌측 랭킹 목록에서 항목을 선택하거나, 분석 목록을 확인해주세요.</p>;
    }
    
    // 이미지를 참고하여 간단한 카드 형태로 상세 정보 표시
    return (
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
    );
  };

  // ------------------------------------------------------
  // 🔥 UI 출력 (CSS 클래스 적용)
  // ------------------------------------------------------
  return (
    <div className="App">
      <h1>🛒 스마트 소싱 분석 대시보드</h1>

      {/* 검색 입력 */}
      <div className="search-container">
        <h3>새로운 키워드 분석 요청</h3>
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
      </div>

      {/* 좌측 랭킹 + 우측 상세 분석 */}
      <div className="main-layout-container">
        {/* 좌측: 카테고리 랭킹 */}
        <div className="panel-container left-panel">
          <h3 className="panel-title">🔥 네이버 쇼핑 카테고리 TOP10</h3>

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
