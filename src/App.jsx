import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css'; 

// 🔥 백엔드 주소
const API_BASE_URL = "http://localhost:8080";

// ------------------------------------------------------
// 🔥 UI 스타일 함수
// ------------------------------------------------------
const getScoreBadgeStyle = (score) => {
  if (score >= 80) return { backgroundColor: '#e6f4ea', color: '#0b6f3b' };
  if (score >= 40) return { backgroundColor: '#fff7d6', color: '#7f6500' };
  return { backgroundColor: '#ffe3e3', color: '#a10f0f' };
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

// ------------------------------------------------------
// 🔥 메인 컴포넌트
// ------------------------------------------------------
function App() {
  const [keyword, setKeyword] = useState('');
  const [dataList, setDataList] = useState([]);
  const [rankingList, setRankingList] = useState([]);

  // 🔥 선택된 카테고리
  const [selectedCategory, setSelectedCategory] = useState("전체");

  const [loading, setLoading] = useState(false);

  const CATEGORY_LIST = ["전체", "패션의류", "화장품/미용", "식품"];

  useEffect(() => {
    console.log("🔥 백엔드에서 받은 rankingList:", rankingList);
  }, [rankingList]);
  
  // -----------------------------
  // 🔥 우측 목록 조회
  // -----------------------------
  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/market/list`);
      setDataList(res.data);
    } catch (err) {
      console.error("데이터 조회 실패:", err);
    }
  };

  // -----------------------------
  // 🔥 좌측 랭킹 조회
  // -----------------------------
  const fetchRanking = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/market/ranking`);
      setRankingList(res.data);
    } catch (err) {
      console.error("랭킹 조회 실패:", err);
    }
  };

  // -----------------------------
  // 🔥 키워드 분석 요청
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
      fetchData();
    } catch (err) {
      console.error("요청 실패:", err);
      alert("SQS 전송 오류!");
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
  const filteredRanking = rankingList.filter(item => {
    if (selectedCategory === "전체") return true;

    // item.keyword 형태: "[패션의류] 겨울 패딩"
    return item.keyword.startsWith(`[${selectedCategory}]`);
  });

  // ------------------------------------------------------
  // 🔥 랭킹 테이블 렌더링
  // ------------------------------------------------------
  const renderRankingTable = (list) => (
    <table className="data-table ranking-table" style={{ width: '100%' }}>
      <thead>
        <tr className="table-header-row">
          <th style={thStyle}>순위</th>
          <th style={thStyle}>상품명</th>
          <th style={thStyle}>검색량 지수</th>
        </tr>
      </thead>
      <tbody>
        {list.length === 0 ? (
          <tr>
            <td colSpan="3" style={{ textAlign: "center", padding: "20px" }}>
              데이터 없음
            </td>
          </tr>
        ) : (
          list.map(item => (
            // 🔥 key 수정: rank만 쓰면 중복될 수 있으니 rank+keyword 조합
            <tr key={`${item.rank}-${item.keyword}`} className="ranking-row">
              <td style={tdStyle}><strong>{item.rank}위</strong></td>
              <td style={tdStyle}>{item.keyword}</td>
              <td style={tdStyle}>
                <span
                  style={{
                    backgroundColor: '#d6e9ff',
                    color: '#0056b3',
                    padding: '4px 8px',
                    borderRadius: '5px'
                  }}
                >
                  {item.searchRatio}
                </span>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  // ------------------------------------------------------
  // 🔥 우측 상세 테이블 렌더링
  // ------------------------------------------------------
  const renderAnalysisTable = (list) => (
    <table className="data-table" style={{ width: '100%' }}>
      <thead>
        <tr className="table-header-row">
          <th style={thStyle}>ID</th>
          <th style={thStyle}>소싱 점수</th>
          <th style={thStyle}>검색어</th>
          <th style={thStyle}>카테고리</th>
          <th style={thStyle}>총 상품 수</th>
          <th style={thStyle}>경쟁 강도</th>
          <th style={thStyle}>검색량 지수</th>
          <th style={thStyle}>매력도</th>
          <th style={thStyle}>평균 가격</th>
          <th style={thStyle}>최저가</th>
          <th style={thStyle}>1등 상품명</th>
        </tr>
      </thead>
      <tbody>
        {list.length === 0 ? (
          <tr>
            <td colSpan="11" style={{ textAlign: "center", padding: "20px" }}>
              데이터 없음
            </td>
          </tr>
        ) : (
          list.map(item => (
            <tr key={item.id}>
              <td style={tdStyle}>{item.id}</td>
              <td style={tdStyle}>
                <span className="score-pill" style={getScoreBadgeStyle(item.sourcingScore)}>
                  {item.sourcingScore}
                </span>
              </td>
              <td style={tdStyle}><strong>{item.searchKeyword}</strong></td>
              <td style={tdStyle}>{item.category}</td>
              <td style={tdStyle}>{item.totalListings?.toLocaleString()}</td>
              <td style={tdStyle}>
                {getCompetitionIcon(item.competitionLevel)} {item.competitionLevel}
              </td>
              <td style={tdStyle}>{item.searchVolumeRatio}</td>
              <td style={tdStyle}>
                {getAttractivenessIcon(item.marketAttractiveness)} {item.marketAttractiveness}
              </td>
              <td style={tdStyle}>{item.averagePrice?.toLocaleString()}원</td>
              <td style={{ ...tdStyle, color: 'red' }}>{item.lowestPrice?.toLocaleString()}원</td>
              <td style={tdStyle}>{item.topItemName}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  // ------------------------------------------------------
  // 🔥 UI 출력
  // ------------------------------------------------------
  return (
    <div className="App" style={{ padding: "20px" }}>
      <h1>🛒 스마트 소싱 분석 대시보드</h1>

      {/* 검색 입력 */}
      <div
        style={{
          marginBottom: "30px",
          padding: "15px",
          border: "1px solid #ddd",
          borderRadius: "10px"
        }}
      >
        <h3>새로운 키워드 분석 요청</h3>
        <input
          type="text"
          placeholder="예: 전기담요, 원터치텐트..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ padding: "10px", width: "300px", marginRight: "10px" }}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            padding: "10px 15px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "5px"
          }}
        >
          {loading ? "전송 중..." : "분석 요청 🚀"}
        </button>
      </div>

      {/* 좌측 랭킹 + 우측 분석 테이블 */}
      <div style={{ display: "flex", gap: "25px" }}>
        {/* 좌측: 카테고리 랭킹 */}
        <div style={{ flex: 1 }}>
          <h3>🔥 네이버 쇼핑 카테고리 TOP10</h3>

          {/* 🔥 카테고리 버튼 */}
          <div style={{ marginBottom: "15px" }}>
            {CATEGORY_LIST.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  marginRight: "10px",
                  padding: "6px 12px",
                  backgroundColor: selectedCategory === cat ? "#007bff" : "#e9e9e9",
                  color: selectedCategory === cat ? "#fff" : "#333",
                  borderRadius: "5px",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 🔥 선택된 카테고리 랭킹 */}
          {renderRankingTable(filteredRanking)}
        </div>

        {/* 우측: 상세 분석 */}
        <div style={{ flex: 2 }}>
          <h3>📊 상세 분석 결과</h3>
          {renderAnalysisTable(dataList)}
        </div>
      </div>
    </div>
  );
}

const thStyle = { padding: "12px 16px" };
const tdStyle = { padding: "12px" };

export default App;
