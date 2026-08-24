/**
 * AnalyticsService — プロバイダー非依存の分析トラッキング抽象化レイヤー
 * ─────────────────────────────────────────────────────────────
 * UI / 業務ロジックはこのファイルが公開する trackXxx(...) のみを呼び出すこと。
 * gtag() など特定プロバイダーのSDKを index.html 側から直接呼び出さない。
 *
 * 将来 Supabase / BigQuery / PostHog 等へ切り替える・併用する場合は、
 * 下部の「provider」オブジェクトを追加して init() で registerProvider するだけでよい。
 * 呼び出し側（index.html）は一切変更不要。
 *
 * 使い方（index.html側）:
 *   <script src="analytics.js"></script>
 *   ...
 *   AnalyticsService.trackDiagnosisStart();
 *   AnalyticsService.trackShopClick(product, 'amazon');
 */
(function (global) {
  'use strict';

  // ── 設定 ────────────────────────────────────────────────
  var GA4_MEASUREMENT_ID = 'G-C2TVLD6X0T';

  // URLに ?ga_debug=1 を付けてアクセスするとDebugView用のdebug_modeを有効化し、
  // localStorageに保持して以降のアクセスでも維持する（拡張機能不要）。
  // ?ga_debug=0 で無効化できる。
  function isDebugRequested() {
    try {
      if (/[?&]ga_debug=1\b/.test(global.location.search)) {
        global.localStorage.setItem('ga_debug', '1');
      }
      if (/[?&]ga_debug=0\b/.test(global.location.search)) {
        global.localStorage.removeItem('ga_debug');
      }
      return global.localStorage.getItem('ga_debug') === '1';
    } catch (e) {
      return false;
    }
  }

  // ── プロバイダー登録・ディスパッチの基盤 ───────────────────
  var providers = [];

  function registerProvider(provider) {
    providers.push(provider);
  }

  function dispatch(eventName, params) {
    providers.forEach(function (p) {
      try {
        p.track(eventName, params || {});
      } catch (e) {
        console.warn('[AnalyticsService] provider error:', p.name, e);
      }
    });
  }

  // ── GA4 provider ───────────────────────────────────────
  var ga4Provider = {
    name: 'ga4',
    init: function () {
      console.log('[AS] ① ga4Provider.init() 開始 | MEASUREMENT_ID=', GA4_MEASUREMENT_ID);
      if (!GA4_MEASUREMENT_ID || GA4_MEASUREMENT_ID.indexOf('XXXX') > -1) {
        console.info('[AnalyticsService] GA4未設定のため計測をスキップします（analytics.js の GA4_MEASUREMENT_ID を設定してください）');
        return;
      }
      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_MEASUREMENT_ID;
      script.onload = function () {
        console.log('[AS] ⑧ script.onload — gtag.js ロード完了 | typeof gtag=', typeof global.gtag);
      };
      script.onerror = function (e) {
        console.error('[AS] ⑨ script.onerror — gtag.js ロード失敗', e);
      };
      document.head.appendChild(script);

      global.dataLayer = global.dataLayer || [];
      global.gtag = function () { global.dataLayer.push(arguments); };
      global.gtag('js', new Date());

      var configParams = { anonymize_ip: true };
      if (isDebugRequested()) {
        configParams.debug_mode = true;
        console.info('[AnalyticsService] GA4 debug_mode 有効化（DebugViewに表示されます）');
      }
      console.log('[AS] ② gtag(config) 実行 | params=', JSON.stringify(configParams));
      global.gtag('config', GA4_MEASUREMENT_ID, configParams);
    },
    track: function (eventName, params) {
      console.log('[AS] ③ track() 呼び出し');
      console.log('[AS] ④ eventName=', eventName);
      console.log('[AS] ⑤ params=', JSON.stringify(params));
      if (typeof global.gtag !== 'function') {
        console.warn('[AS] track() SKIP — typeof gtag !== function');
        return;
      }
      console.log('[AS] ⑥ gtag(event) 実行直前 | typeof gtag=', typeof global.gtag);
      global.gtag('event', eventName, params);
      console.log('[AS] ⑦ gtag(event) 実行直後');
    }
  };

  // ── 将来のプロバイダー追加例（未実装のスタブ）────────────────
  // 実装後、init() 内で registerProvider(supabaseProvider) のように登録するだけでよい。
  //
  // var supabaseProvider = {
  //   name: 'supabase',
  //   init: function(){ /* Supabaseクライアント初期化など */ },
  //   track: function(eventName, params){ /* supabase.from('events').insert(...) など */ }
  // };
  //
  // var bigQueryProvider = {
  //   name: 'bigquery',
  //   init: function(){ /* 収集用エンドポイントの準備など */ },
  //   track: function(eventName, params){ /* fetch('/api/collect', {method:'POST', body:...}) など */ }
  // };
  //
  // var postHogProvider = {
  //   name: 'posthog',
  //   init: function(){ /* posthog.init(...) */ },
  //   track: function(eventName, params){ /* posthog.capture(eventName, params) */ }
  // };

  function init() {
    registerProvider(ga4Provider);
    // registerProvider(supabaseProvider); // 切替・併用時にコメント解除
    // registerProvider(bigQueryProvider);
    // registerProvider(postHogProvider);
    providers.forEach(function (p) { if (p.init) p.init(); });
  }

  // ── 公開する意味的トラッキングAPI ───────────────────────────
  // イベント名・パラメータ構造はここで一元管理する。
  // 呼び出し側は「何が起きたか」だけを伝え、送信先の詳細を意識しない。

  function trackDiagnosisStart() {
    dispatch('diagnosis_start', {});
  }

  function trackDiagnosisComplete(skinType, concerns) {
    dispatch('diagnosis_complete', {
      skin_type: skinType,
      concerns: (concerns || []).join(',')
    });
  }

  function trackProductClick(product, context) {
    if (!product) return;
    dispatch('product_click', {
      product_id: product.id,
      brand: product.brand,
      category: product.category,
      context: context || 'card'
    });
  }

  function trackIngredientClick(ingredientId) {
    dispatch('ingredient_click', { ingredient_id: ingredientId });
  }

  function trackShopClick(product, shop) {
    if (!product) return;
    dispatch('shop_click', {
      product_id: product.id,
      brand: product.brand,
      category: product.category,
      shop: shop
    });
  }

  function trackSearch(query) {
    if (!query) return;
    dispatch('search', { query: query });
  }

  function trackShare(method, target) {
    dispatch('share', { method: method, target: target });
  }

  function trackQuizQuestionReached(questionIndex, totalQuestions) {
    dispatch('quiz_question_reached', {
      question_index: questionIndex,
      question_number: questionIndex + 1,
      total_questions: totalQuestions
    });
  }

  function trackQuizAbandon(questionIndex) {
    dispatch('quiz_abandon', {
      question_index: questionIndex,
      question_number: questionIndex + 1
    });
  }

  function trackFilterUse(filterType, filterValue) {
    dispatch('filter_use', {
      filter_type: filterType,
      filter_value: filterValue
    });
  }

  // ── 公開インターフェース ───────────────────────────────────
  global.AnalyticsService = {
    init: init,
    registerProvider: registerProvider,
    trackDiagnosisStart: trackDiagnosisStart,
    trackDiagnosisComplete: trackDiagnosisComplete,
    trackProductClick: trackProductClick,
    trackIngredientClick: trackIngredientClick,
    trackShopClick: trackShopClick,
    trackSearch: trackSearch,
    trackShare: trackShare,
    trackQuizQuestionReached: trackQuizQuestionReached,
    trackQuizAbandon: trackQuizAbandon,
    trackFilterUse: trackFilterUse
  };

  global.AnalyticsService.init();
})(window);
