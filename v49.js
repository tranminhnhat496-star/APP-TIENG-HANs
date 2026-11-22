/* V49 — Boss Mic Fix (V19.4, 19.4.0).
   Shared helper for the fixed bossSpeak() in the V18 and V19 combat
   engines: one Vietnamese error message per SpeechRecognition error
   code, each with a clear retry step. No localStorage, no window.S,
   no save-key or schema change — this layer is a pure helper. */
(function(){
  'use strict';
  var VERSION='19.4.0';
  var ERR={
    'not-allowed':'Micro bị chặn. Hãy cho phép micro cho trang này (bấm biểu tượng ổ khóa trên thanh địa chỉ → Quyền micro → Cho phép) rồi bấm “Nói” thử lại.',
    'service-not-allowed':'Micro bị chặn. Hãy cho phép micro cho trang này (bấm biểu tượng ổ khóa trên thanh địa chỉ → Quyền micro → Cho phép) rồi bấm “Nói” thử lại.',
    'no-speech':'Máy không nghe thấy gì. Hãy nói to và rõ hơn, gần micro hơn, rồi bấm “Nói” thử lại.',
    'audio-capture':'Không tìm thấy micro. Hãy cắm hoặc bật micro rồi bấm “Nói” thử lại.',
    'network':'Lỗi mạng khi nhận dạng giọng nói. Hãy kiểm tra mạng rồi bấm “Nói” thử lại.',
    'aborted':'Đã dừng nghe. Bấm “Nói” để thử lại.',
    'start-failed':'Không mở được micro. Hãy kiểm tra micro rồi bấm “Nói” thử lại.',
    'unknown':'Không nghe được giọng nói. Hãy kiểm tra micro rồi bấm “Nói” thử lại.'
  };
  function speakErrMsg(code){return ERR[code]||ERR['unknown'];}
  window.__v49={version:VERSION,speakErrMsg:speakErrMsg};
})();
