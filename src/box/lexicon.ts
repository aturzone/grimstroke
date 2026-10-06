/**
 * The words for working with repositories, language by language: how an issue is asked for,
 * what a fault sounds like, what each kind of issue is called, and the words for label,
 * repository, description and type.
 *
 * English, Persian and Russian are read with their own hand-made patterns (issue.ts, rules.ts,
 * commands.ts); every language here is added to those, so a language is one entry in this list.
 * Words are lowercase. A word in a script with spaces is matched as a whole word; Chinese and
 * Japanese, which have none, are matched inside the line.
 */

import type { IssueType } from '@core/box/issue.ts';

export interface GitWords {
  /** The language, by its tag. */
  lang: string;
  /** Asking for an issue, said at the start of a line: "crea un issue", "erstelle ein ticket". */
  make: string[];
  /** An issue by name: "ticket", "fehler", "incidencia". */
  issue: string[];
  /** A fault described: "funktioniert nicht", "no funciona". */
  fault: string[];
  /** Parts of words a fault is said with, matched inside a word: Turkish "-muyor", German "stürzt". */
  faultStems: string[];
  /** What each kind is called. */
  types: Record<IssueType, string[]>;
  label: string[];
  repo: string[];
  description: string[];
  /** The word for "type", as in "type bug". */
  type: string[];
  /** "in", "on": what comes before a repository named after the labels ("im repository web"). */
  in: string[];
  /** How a sentence says what a label stands for (labels.ts), by the concept's id: stems. */
  concepts: Record<string, string[]>;
}

export const GIT_WORDS: readonly GitWords[] = [
  {
    lang: 'de',
    make: [
      'erstelle ein issue',
      'erstelle ein ticket',
      'neues issue',
      'neues ticket',
      'melde einen fehler',
      'lege ein ticket an',
    ],
    issue: ['issue', 'ticket', 'fehlerbericht', 'aufgabe'],
    fault: ['funktioniert nicht', 'stürzt ab', 'absturz', 'geht nicht', 'kaputt', 'fehlermeldung'],
    faultStems: ['stürzt', 'funktioniert nicht', 'findet nicht', 'lädt nicht', 'geht nicht'],
    types: {
      bug: ['fehler', 'bug', 'defekt'],
      feature: ['funktion', 'feature', 'verbesserung', 'wunsch'],
      task: ['aufgabe', 'task'],
      docs: ['dokumentation', 'doku'],
      question: ['frage'],
    },
    label: ['label', 'labels', 'etikett', 'etiketten'],
    repo: ['repo', 'repository', 'projekt'],
    description: ['beschreibung', 'details'],
    type: ['typ', 'art'],
    in: ['im', 'in', 'auf'],
    concepts: {
      ui: [
        'knopf',
        'schaltfläche',
        'seite',
        'bildschirm',
        'design',
        'oberfläche',
        'farbe',
        'schrift',
      ],
      backend: ['server', 'backend', 'schnittstelle'],
      database: ['datenbank', 'tabelle', 'migration'],
      auth: ['anmeld', 'login', 'passwort', 'kennwort', 'token', 'berechtigung'],
      security: ['sicherheit', 'lücke', 'schwachstelle'],
      performance: ['langsam', 'schnell', 'leistung', 'speicher', 'ruckelt', 'hängt'],
      mobile: ['handy', 'telefon', 'mobil', 'android', 'iphone'],
      accessibility: ['barrierefrei', 'kontrast', 'tastatur'],
      i18n: ['übersetz', 'sprache', 'deutsch'],
      testing: ['test'],
      ci: ['build', 'pipeline', 'deploy', 'docker'],
      dependencies: ['abhängigkeit', 'paket', 'version'],
      crash: ['absturz', 'stürzt ab', 'friert ein'],
      notifications: ['benachrichtigung', 'erinnerung', 'e-mail'],
      'priority-high': ['dringend', 'wichtig', 'kritisch', 'sofort'],
      'priority-low': ['unwichtig', 'nicht dringend', 'irgendwann'],
      refactor: ['refaktor', 'aufräumen'],
    },
  },
  {
    lang: 'fr',
    make: [
      'crée une issue',
      'crée un ticket',
      'nouvelle issue',
      'nouveau ticket',
      'ouvre un ticket',
      'signale un bug',
    ],
    issue: ['issue', 'ticket', 'anomalie', 'tâche'],
    fault: [
      'ne fonctionne pas',
      'ne marche pas',
      'plante',
      'plantage',
      'cassé',
      "message d'erreur",
    ],
    faultStems: ['plant', 'ne charge pas', 'ne trouve rien'],
    types: {
      bug: ['bogue', 'bug', 'anomalie', 'erreur'],
      feature: ['fonctionnalité', 'amélioration', 'demande'],
      task: ['tâche'],
      docs: ['documentation', 'doc'],
      question: ['question'],
    },
    label: ['étiquette', 'étiquettes', 'label', 'labels'],
    repo: ['dépôt', 'repo', 'projet'],
    description: ['description', 'détails'],
    type: ['type'],
    in: ['dans', 'sur', 'en'],
    concepts: {
      ui: ['bouton', 'page', 'écran', 'design', 'interface', 'couleur', 'police'],
      backend: ['serveur', 'backend'],
      database: ['base de données', 'table', 'migration'],
      auth: ['connexion', 'mot de passe', 'jeton', 'permission'],
      security: ['sécurité', 'faille', 'vulnérab'],
      performance: ['lent', 'rapide', 'performance', 'mémoire', 'saccad'],
      mobile: ['téléphone', 'mobile', 'android', 'iphone'],
      accessibility: ['accessib', 'contraste', 'clavier'],
      i18n: ['tradu', 'langue', 'français'],
      testing: ['test'],
      ci: ['build', 'pipeline', 'déploi', 'docker'],
      dependencies: ['dépendance', 'paquet', 'version'],
      crash: ['plantage', 'plante', 'gel'],
      notifications: ['notification', 'rappel', 'courriel'],
      'priority-high': ['urgent', 'important', 'critique', 'bloquant'],
      'priority-low': ['mineur', 'pas urgent'],
      refactor: ['refactor', 'nettoyage'],
    },
  },
  {
    lang: 'es',
    make: [
      'crea un issue',
      'crea una incidencia',
      'crea un ticket',
      'nuevo issue',
      'nueva incidencia',
      'abre un ticket',
      'reporta un error',
    ],
    issue: ['issue', 'incidencia', 'ticket', 'tarea'],
    fault: ['no funciona', 'se cuelga', 'se bloquea', 'falla', 'roto', 'mensaje de error'],
    faultStems: ['cuelg', 'no encuentra', 'no carga', 'no guarda'],
    types: {
      bug: ['error', 'fallo', 'bug'],
      feature: ['funcionalidad', 'mejora', 'petición', 'característica'],
      task: ['tarea'],
      docs: ['documentación', 'docs'],
      question: ['pregunta'],
    },
    label: ['etiqueta', 'etiquetas', 'label'],
    repo: ['repositorio', 'repo', 'proyecto'],
    description: ['descripción', 'detalles'],
    type: ['tipo'],
    in: ['en'],
    concepts: {
      ui: ['botón', 'página', 'pantalla', 'diseño', 'interfaz', 'color', 'fuente'],
      backend: ['servidor', 'backend'],
      database: ['base de datos', 'tabla', 'migración'],
      auth: ['inicio de sesión', 'login', 'contraseña', 'token', 'permiso'],
      security: ['seguridad', 'vulnerab', 'fuga'],
      performance: ['lento', 'rápido', 'rendimiento', 'memoria', 'se traba'],
      mobile: ['teléfono', 'móvil', 'celular', 'android', 'iphone'],
      accessibility: ['accesib', 'contraste', 'teclado'],
      i18n: ['traduc', 'idioma', 'español'],
      testing: ['prueba', 'test'],
      ci: ['compilación', 'pipeline', 'despliegue', 'docker'],
      dependencies: ['dependencia', 'paquete', 'versión'],
      crash: ['se cuelga', 'se cierra', 'bloqueo'],
      notifications: ['notificación', 'recordatorio', 'correo'],
      'priority-high': ['urgente', 'importante', 'crítico', 'bloqueante'],
      'priority-low': ['menor', 'no urgente'],
      refactor: ['refactor', 'limpieza'],
    },
  },
  {
    lang: 'pt',
    make: [
      'crie uma issue',
      'cria uma issue',
      'crie um chamado',
      'nova issue',
      'novo chamado',
      'abra um chamado',
      'reporte um erro',
    ],
    issue: ['issue', 'chamado', 'tarefa', 'ticket'],
    fault: ['não funciona', 'trava', 'travou', 'quebrado', 'mensagem de erro'],
    faultStems: ['trav', 'não encontra', 'não carrega', 'não salva'],
    types: {
      bug: ['erro', 'falha', 'bug'],
      feature: ['funcionalidade', 'melhoria', 'pedido', 'recurso'],
      task: ['tarefa'],
      docs: ['documentação', 'docs'],
      question: ['pergunta', 'dúvida'],
    },
    label: ['etiqueta', 'etiquetas', 'rótulo', 'rótulos', 'label'],
    repo: ['repositório', 'repo', 'projeto'],
    description: ['descrição', 'detalhes'],
    type: ['tipo'],
    in: ['no', 'na', 'em'],
    concepts: {
      ui: ['botão', 'página', 'tela', 'design', 'interface', 'cor', 'fonte'],
      backend: ['servidor', 'backend'],
      database: ['banco de dados', 'tabela', 'migração'],
      auth: ['login', 'senha', 'token', 'permissão'],
      security: ['segurança', 'vulnerab', 'vazamento'],
      performance: ['lento', 'rápido', 'desempenho', 'memória', 'trava'],
      mobile: ['celular', 'telefone', 'móvel', 'android', 'iphone'],
      accessibility: ['acessib', 'contraste', 'teclado'],
      i18n: ['tradu', 'idioma', 'português'],
      testing: ['teste'],
      ci: ['build', 'pipeline', 'deploy', 'docker'],
      dependencies: ['dependência', 'pacote', 'versão'],
      crash: ['trava', 'fecha sozinho', 'congela'],
      notifications: ['notificação', 'lembrete', 'e-mail'],
      'priority-high': ['urgente', 'importante', 'crítico'],
      'priority-low': ['menor', 'não urgente'],
      refactor: ['refator', 'limpeza'],
    },
  },
  {
    lang: 'it',
    make: [
      'crea una issue',
      'crea un ticket',
      'nuova issue',
      'nuovo ticket',
      'apri un ticket',
      'segnala un errore',
    ],
    issue: ['issue', 'ticket', 'segnalazione', 'compito'],
    fault: ['non funziona', 'si blocca', 'si chiude', 'rotto', "messaggio d'errore"],
    faultStems: ['blocc', 'non trova', 'non carica', 'non salva'],
    types: {
      bug: ['errore', 'bug', 'difetto'],
      feature: ['funzionalità', 'miglioramento', 'richiesta'],
      task: ['compito', 'attività'],
      docs: ['documentazione', 'docs'],
      question: ['domanda'],
    },
    label: ['etichetta', 'etichette', 'label'],
    repo: ['repository', 'repo', 'progetto'],
    description: ['descrizione', 'dettagli'],
    type: ['tipo'],
    in: ['nel', 'nella', 'in', 'su'],
    concepts: {
      ui: ['pulsante', 'pagina', 'schermo', 'design', 'interfaccia', 'colore', 'carattere'],
      backend: ['server', 'backend'],
      database: ['database', 'tabella', 'migrazione'],
      auth: ['accesso', 'login', 'password', 'token', 'permess'],
      security: ['sicurezza', 'vulnerab'],
      performance: ['lento', 'veloce', 'prestazioni', 'memoria', 'scatta'],
      mobile: ['telefono', 'cellulare', 'mobile', 'android', 'iphone'],
      accessibility: ['accessib', 'contrasto', 'tastiera'],
      i18n: ['tradu', 'lingua', 'italiano'],
      testing: ['test'],
      ci: ['build', 'pipeline', 'deploy', 'docker'],
      dependencies: ['dipendenz', 'pacchetto', 'versione'],
      crash: ['si blocca', 'si chiude', 'crash'],
      notifications: ['notifica', 'promemoria', 'email'],
      'priority-high': ['urgente', 'importante', 'critico', 'bloccante'],
      'priority-low': ['minore', 'non urgente'],
      refactor: ['refactor', 'pulizia'],
    },
  },
  {
    lang: 'tr',
    make: ['issue aç', 'issue oluştur', 'yeni issue', 'yeni kayıt', 'hata bildir', 'talep oluştur'],
    issue: ['issue', 'kayıt', 'talep', 'görev'],
    fault: ['çalışmıyor', 'çöküyor', 'çöktü', 'bozuk', 'hata veriyor', 'açılmıyor'],
    faultStems: ['muyor', 'mıyor', 'miyor', 'müyor', 'çök'],
    types: {
      bug: ['hata', 'bug'],
      feature: ['özellik', 'iyileştirme', 'istek'],
      task: ['görev'],
      docs: ['dokümantasyon', 'belge'],
      question: ['soru'],
    },
    label: ['etiket', 'etiketler', 'label'],
    repo: ['depo', 'repo', 'proje'],
    description: ['açıklama', 'detay'],
    type: ['tür', 'tip'],
    in: ['içinde'],
    concepts: {
      ui: ['buton', 'düğme', 'sayfa', 'ekran', 'tasarım', 'arayüz', 'renk', 'yazı tipi'],
      backend: ['sunucu', 'backend'],
      database: ['veritabanı', 'tablo', 'migration'],
      auth: ['giriş', 'şifre', 'parola', 'token', 'yetki'],
      security: ['güvenlik', 'açık', 'zafiyet'],
      performance: ['yavaş', 'hızlı', 'performans', 'bellek', 'donuyor'],
      mobile: ['telefon', 'mobil', 'android', 'iphone'],
      accessibility: ['erişilebilir', 'kontrast', 'klavye'],
      i18n: ['çeviri', 'dil', 'türkçe'],
      testing: ['test'],
      ci: ['derleme', 'pipeline', 'dağıtım', 'docker'],
      dependencies: ['bağımlılık', 'paket', 'sürüm'],
      crash: ['çöküyor', 'çöktü', 'donuyor'],
      notifications: ['bildirim', 'hatırlatma', 'e-posta'],
      'priority-high': ['acil', 'önemli', 'kritik'],
      'priority-low': ['önemsiz', 'acil değil'],
      refactor: ['refactor', 'temizlik'],
    },
  },
  {
    lang: 'ar',
    make: ['أنشئ تذكرة', 'افتح تذكرة', 'أنشئ مشكلة', 'تذكرة جديدة', 'أبلغ عن خطأ'],
    issue: ['تذكرة', 'مشكلة', 'مهمة'],
    fault: ['لا يعمل', 'يتعطل', 'تعطل', 'معطل', 'رسالة خطأ'],
    faultStems: ['يتعطل', 'لا يعمل', 'لا يجد'],
    types: {
      bug: ['خطأ', 'علة'],
      feature: ['ميزة', 'تحسين', 'طلب'],
      task: ['مهمة'],
      docs: ['توثيق', 'وثائق'],
      question: ['سؤال'],
    },
    label: ['وسم', 'وسوم', 'تصنيف'],
    repo: ['مستودع', 'المستودع'],
    description: ['الوصف', 'وصف', 'التفاصيل'],
    type: ['النوع', 'نوع'],
    in: ['في', 'على'],
    concepts: {
      ui: ['زر', 'صفحة', 'شاشة', 'تصميم', 'واجهة', 'لون', 'خط'],
      backend: ['خادم', 'سيرفر'],
      database: ['قاعدة بيانات', 'جدول'],
      auth: ['تسجيل الدخول', 'كلمة المرور', 'رمز', 'صلاحية'],
      security: ['أمان', 'ثغرة'],
      performance: ['بطيء', 'سريع', 'أداء', 'ذاكرة', 'يتجمد'],
      mobile: ['هاتف', 'جوال', 'موبايل', 'أندرويد', 'آيفون'],
      accessibility: ['إمكانية الوصول', 'تباين', 'لوحة المفاتيح'],
      i18n: ['ترجمة', 'لغة', 'العربية'],
      testing: ['اختبار'],
      ci: ['بناء', 'نشر', 'دوكر'],
      dependencies: ['اعتمادية', 'حزمة', 'إصدار'],
      crash: ['يتعطل', 'تعطل', 'يتجمد'],
      notifications: ['إشعار', 'تذكير', 'بريد'],
      'priority-high': ['عاجل', 'مهم', 'حرج'],
      'priority-low': ['ثانوي', 'غير عاجل'],
      refactor: ['إعادة هيكلة', 'تنظيف'],
    },
  },
  {
    lang: 'zh',
    make: ['创建工单', '新建工单', '创建问题', '新建问题', '提交缺陷', '报告错误'],
    issue: ['工单', '议题', '缺陷', '任务'],
    fault: ['不工作', '无法', '崩溃', '闪退', '报错', '打不开'],
    faultStems: ['不工作', '无法', '崩溃', '找不到', '不能'],
    types: {
      bug: ['错误', '缺陷', '漏洞'],
      feature: ['功能', '新功能', '改进', '需求'],
      task: ['任务'],
      docs: ['文档'],
      question: ['问题咨询', '疑问'],
    },
    label: ['标签'],
    repo: ['仓库', '代码库', '项目'],
    description: ['描述', '详情'],
    type: ['类型'],
    in: ['在'],
    concepts: {
      ui: ['按钮', '页面', '屏幕', '设计', '界面', '颜色', '字体'],
      backend: ['服务器', '后端', '接口'],
      database: ['数据库', '表', '迁移'],
      auth: ['登录', '密码', '令牌', '权限'],
      security: ['安全', '漏洞'],
      performance: ['慢', '卡顿', '性能', '内存'],
      mobile: ['手机', '移动', '安卓', '苹果'],
      accessibility: ['无障碍', '对比度', '键盘'],
      i18n: ['翻译', '语言', '中文'],
      testing: ['测试'],
      ci: ['构建', '流水线', '部署', 'docker'],
      dependencies: ['依赖', '包', '版本'],
      crash: ['崩溃', '闪退', '卡死'],
      notifications: ['通知', '提醒', '邮件'],
      'priority-high': ['紧急', '重要', '严重'],
      'priority-low': ['次要', '不急'],
      refactor: ['重构', '清理'],
    },
  },
];

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const spaced = (w: string): boolean => /[a-zà-ÿа-я؀-ۿÀ-ɏ]/i.test(w);

/** A pattern for any of these words: as whole words where a script has spaces. */
export function wordsPattern(words: readonly string[]): string {
  const latin = words.filter(spaced).map(esc);
  const other = words.filter((w) => !spaced(w)).map(esc);
  return [
    ...(latin.length ? [`(?<![\\p{L}])(?:${latin.join('|')})(?![\\p{L}])`] : []),
    ...(other.length ? [`(?:${other.join('|')})`] : []),
  ].join('|');
}

/** Every language's words of one kind, together: longest first, so "repository" wins over "repo". */
export function allWords(pick: (w: GitWords) => readonly string[]): string[] {
  return [...new Set(GIT_WORDS.flatMap(pick))].sort((a, b) => b.length - a.length);
}
