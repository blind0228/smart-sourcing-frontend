// App.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// 로컬 테스트 URL
const API_BASE_URL = "http://localhost:8080"; 

function App() {
  const [keyword, setKeyword] = useState('');
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. 데이터 조회 함수 (GET /api/market/list)
  const fetchData = async () => {
    try {
      // MarketAnalysisResponse DTO 리스트 조회
      const response = await axios.get(`${API_BASE_URL}/api/market/list`);
      setDataList(response.data);
    } catch (error) {
      console.error("데이터 조회 실패:", error);
      alert("데이터를 불러오지 못했습니다. 백엔드가 켜져 있고 CORS 설정이 올바른지 확인하세요.");
    }
  };

  // 2. 검색 요청 함수 (POST /api/sourcing/request)
  const handleSearch = async () => {
    if (!keyword) {
      alert("키워드를 입력해주세요!");
      return;
    }

    setLoading(true);
    try {
      // 분석 요청 보내기 (SQS에 메시지 전송 요청)
      await axios.post(`${API_BASE_URL}/api/sourcing/request?keyword=${keyword}`);
      alert(`'${keyword}' 분석 요청이 접수되었습니다! 잠시 후 새로고침 해보세요.`);
      setKeyword('');
      
      // 요청 후 목록 갱신 시도 (분석 결과가 바로 나타나지 않을 수 있습니다.)
      fetchData(); 
    } catch (error) {
      console.error("요청 실패:", error);
      alert("분석 요청 중 오류가 발생했습니다. SQS 전송 로직을 확인하세요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="App" style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>🛒 스마트 소싱 분석기 (네이버 데이터랩 통합)</h1>
      
      {/* 검색창 영역 */}
      <div style={{ marginBottom: "30px", padding: "20px", border: "1px solid #ddd", borderRadius: "10px" }}>
        <h3>새로운 키워드 분석하기</h3>
        <input 
          type="text" 
          placeholder="예: 게이밍 마우스, 손난로" 
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ padding: "10px", width: "200px", marginRight: "10px" }}
        />
        <button 
          onClick={handleSearch} 
          disabled={loading}
          style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "#ffffff", border: "none", borderRadius: "5px", cursor: "pointer" }}
        >
          {loading ? "전송 중..." : "분석 요청 🚀"}
        </button>
      </div>

      {/* 결과 목록 영역 */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>📊 분석 결과 목록</h3>
          <button onClick={fetchData} style={{ padding: "5px 10px", cursor: "pointer" }}>🔄 목록 새로고침</button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
        <thead>
            <tr style={{ backgroundColor: "green", textAlign: "left", color: "#ffffff" }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>소싱 점수</th> {/* ⬅️ 가장 중요한 지표를 먼저 보여줍니다. */}
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
            {dataList.length === 0 ? (
              <tr><td colSpan="11" style={{ textAlign: "center", padding: "20px" }}>아직 데이터가 없습니다. 검색을 시작해보세요!</td></tr>
            ) : (
              dataList.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={tdStyle}>{item.id}</td>
                  
                  {/* ⬅️ 소싱 점수 (강조) */}
                  <td style={{ ...tdStyle, color: "blue", fontWeight: "bold", fontSize: "1.2em" }}>
                    {item.sourcingScore || '-'}
                  </td>
                  
                  <td style={tdStyle}><strong>{item.searchKeyword}</strong></td>
                  <td style={tdStyle}>{item.category}</td>
                  <td style={tdStyle}>
                    {item.totalListings !== null && item.totalListings !== undefined
                      ? item.totalListings.toLocaleString()
                      : '-'}
                  </td>
                  <td style={tdStyle}>{item.competitionLevel}</td>
                  <td style={tdStyle}>
                    {item.searchVolumeRatio !== null && item.searchVolumeRatio !== undefined
                      ? item.searchVolumeRatio
                      : '-'}
                  </td>
                  <td style={tdStyle}>{item.marketAttractiveness}</td>
                  <td style={tdStyle}>
                    {item.averagePrice !== null && item.averagePrice !== undefined
                      ? item.averagePrice.toLocaleString() + '원'
                      : '-'}
                  </td>
                  <td style={{ ...tdStyle, color: "red", fontWeight: "bold" }}>
                    {item.lowestPrice !== null && item.lowestPrice !== undefined
                      ? item.lowestPrice.toLocaleString() + '원'
                      : '-'}
                  </td>
                  <td style={tdStyle}>{item.topItemName}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = { padding: "12px", borderBottom: "2px solid #ddd" };
const tdStyle = { padding: "12px" };

export default App;
