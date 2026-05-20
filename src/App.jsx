import React, { useState } from 'react';
import { Home, Scan, Package, Bell, HardHat, Search, Plus, ChevronRight, AlertCircle, ArrowDownToLine, ArrowUpFromLine, RotateCcw, Filter, Camera, X, Check, ArrowUpRight, ArrowLeftRight, LayoutGrid, ArrowUpDown, QrCode, ArrowRight } from 'lucide-react';

export default function InteriaLogistique() {
  const [activeScreen, setActiveScreen] = useState('home');

  // === Logo ===
  const Logo = ({ size = 36 }) => (
    <div className="flex items-center gap-3">
      <svg width={size} height={size * 1.15} viewBox="0 0 100 115" fill="none">
        <circle cx="50" cy="10" r="9" fill="#FF8C00" />
        <path
          d="M 25 30 L 25 80 Q 25 95 40 95 Q 55 95 55 80 L 55 30 M 55 80 Q 55 95 70 95 Q 85 95 85 80 L 85 30"
          stroke="#0A0A0A"
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <div className="flex flex-col leading-none">
        <span className="text-[15px] font-bold tracking-tight text-neutral-900">INTERIA</span>
        <span className="text-[10px] font-medium tracking-[0.22em] text-neutral-500 mt-1">LOGISTIQUE</span>
      </div>
    </div>
  );

  // === Styles neumorphism ===
  const neuRaised = {
    background: '#F4F2EE',
    boxShadow: '6px 6px 14px rgba(163, 158, 148, 0.35), -6px -6px 14px rgba(255, 255, 255, 0.95)',
  };
  const neuRaisedSm = {
    background: '#F4F2EE',
    boxShadow: '3px 3px 8px rgba(163, 158, 148, 0.3), -3px -3px 8px rgba(255, 255, 255, 0.9)',
  };
  const neuIconBg = {
    background: 'linear-gradient(145deg, #ffffff, #ebe9e4)',
    boxShadow: '2px 2px 5px rgba(163, 158, 148, 0.25), -2px -2px 5px rgba(255, 255, 255, 0.9)',
  };
  const neuPressed = {
    background: '#F4F2EE',
    boxShadow: 'inset 3px 3px 6px rgba(163, 158, 148, 0.3), inset -3px -3px 6px rgba(255, 255, 255, 0.9)',
  };
  const orangeActive = {
    background: 'linear-gradient(135deg, #FFB570 0%, #FF8C00 45%, #FF7A00 100%)',
    boxShadow: '6px 6px 14px rgba(255, 140, 0, 0.35), -2px -2px 8px rgba(255, 255, 255, 0.6), inset 1px 1px 1px rgba(255, 255, 255, 0.4)',
  };

  // === ECRAN HOME ===
  const HomeScreen = () => (
    <div className="flex flex-col h-full bg-[#F4F2EE] relative">
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-40 pointer-events-none" style={{
        background: 'radial-gradient(circle at top right, rgba(255,255,255,0.9), transparent 70%)',
      }}></div>

      <div className="px-6 pt-6 pb-4 relative">
        <div className="flex items-center justify-between mb-8">
          <Logo size={32} />
          <button className="w-12 h-12 rounded-2xl flex items-center justify-center relative" style={neuRaisedSm}>
            <Bell className="w-[18px] h-[18px] text-neutral-800" strokeWidth={1.75} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-orange-500"></span>
          </button>
        </div>
        <p className="text-[13px] text-neutral-500 font-medium">Bonjour Yoann</p>
        <h1 className="text-[32px] font-bold tracking-tight text-neutral-900 mt-1 leading-tight">Vue d'ensemble</h1>
        <div className="flex items-center gap-1 mt-3">
          <div className="h-1 w-10 rounded-full bg-orange-500"></div>
          <div className="h-1 w-1 rounded-full bg-orange-500"></div>
        </div>
      </div>

      <div className="px-6 mb-6 mt-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-semibold">Alertes en cours</p>
          <button onClick={() => setActiveScreen('alerts')} className="text-[11px] text-orange-600 font-semibold">Voir tout</button>
        </div>
        <div className="space-y-2.5">
          {[
            { name: 'Plaque BA13 standard 250', stock: 3, min: 5 },
            { name: 'Vis TTPC 25mm boîte 500', stock: 1, min: 3 },
          ].map((a, i) => (
            <div key={i} className="rounded-2xl p-3.5 flex items-center gap-3" style={neuRaisedSm}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={neuIconBg}>
                <AlertCircle className="w-[16px] h-[16px] text-orange-500" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-neutral-900 truncate">{a.name}</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">Stock : <span className="text-orange-600 font-semibold">{a.stock}</span> · Seuil : {a.min}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-semibold">Derniers mouvements</p>
          <button className="text-[11px] text-orange-600 font-semibold">Historique</button>
        </div>
        <div className="rounded-2xl p-2" style={neuRaisedSm}>
          {[
            { type: 'in', label: 'Plaque BA13 hydro', meta: '×20 · Point P', time: '12 min' },
            { type: 'out', label: 'Disjoncteur 16A', meta: '×4 · Haussmann', time: '1h' },
            { type: 'return', label: 'Rail M48 stil', meta: '×8 · Cassini', time: '3h' },
          ].map((m, i, arr) => (
            <div key={i} className={`flex items-center gap-3 p-2.5 ${i !== arr.length - 1 ? 'border-b border-neutral-200/40' : ''}`}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={neuIconBg}>
                {m.type === 'in' && <ArrowDownToLine className="w-4 h-4 text-emerald-600" strokeWidth={2} />}
                {m.type === 'out' && <ArrowUpFromLine className="w-4 h-4 text-neutral-700" strokeWidth={2} />}
                {m.type === 'return' && <RotateCcw className="w-4 h-4 text-blue-600" strokeWidth={2} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-neutral-900 truncate">{m.label}</p>
                <p className="text-[11px] text-neutral-500">{m.meta}</p>
              </div>
              <p className="text-[10px] text-neutral-400 font-medium">{m.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // === ECRAN CATALOGUE ===
  const CatalogScreen = () => (
    <div className="flex flex-col h-full bg-[#F4F2EE]">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[13px] text-neutral-500 font-medium">Catalogue</p>
            <h1 className="text-[32px] font-bold tracking-tight text-neutral-900 leading-tight">Articles</h1>
          </div>
          <button className="w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={orangeActive}>
            <Plus className="w-[18px] h-[18px]" strokeWidth={2.5} />
          </button>
        </div>

        <div className="relative mb-4 rounded-2xl flex items-center" style={neuPressed}>
          <Search className="w-4 h-4 text-neutral-400 absolute left-4" strokeWidth={2} />
          <input
            placeholder="Rechercher un article..."
            className="w-full bg-transparent py-3.5 pl-11 pr-4 text-[13px] placeholder-neutral-400 focus:outline-none text-neutral-900"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {['Tous', 'Cloisonnement', 'Électricité', 'Plomberie', 'Peinture', 'Sols'].map((cat, i) => (
            <button
              key={i}
              className="shrink-0 px-4 py-2 rounded-xl text-[11px] font-semibold tracking-tight"
              style={i === 0 ? orangeActive : neuRaisedSm}
            >
              <span className={i === 0 ? 'text-white' : 'text-neutral-700'}>{cat}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 flex-1 space-y-2.5 pb-4 overflow-hidden">
        {[
          { code: 'CLO-BA13-STD-001', name: 'Plaque BA13 standard 250×120', stock: 3, min: 5, supplier: 'Point P', low: true },
          { code: 'CLO-BA13-HYD-001', name: 'Plaque BA13 hydrofuge', stock: 24, min: 8, supplier: 'Point P' },
          { code: 'ELE-DISJ-16A-001', name: 'Disjoncteur 16A Legrand', stock: 47, min: 10, supplier: 'Rexel' },
          { code: 'CLO-RAIL-M48-001', name: 'Rail M48 Stil galva 3m', stock: 32, min: 12, supplier: 'Point P' },
          { code: 'PEI-AMA-BLA-001', name: 'Peinture Amat blanc mat 10L', stock: 6, min: 4, supplier: 'Théodore' },
        ].map((a, i) => (
          <div key={i} className="rounded-2xl p-3.5 flex items-center gap-3" style={neuRaisedSm}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={neuIconBg}>
              <Package className="w-5 h-5 text-neutral-600" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-neutral-900 leading-tight truncate">{a.name}</p>
              <p className="text-[10px] text-neutral-400 font-mono mt-1">{a.code}</p>
              <p className="text-[10px] text-neutral-500 mt-1">{a.supplier} · min {a.min}</p>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <p className={`text-[18px] font-bold tabular-nums leading-none ${a.low ? 'text-orange-500' : 'text-neutral-900'}`}>{a.stock}</p>
              {a.low && <p className="text-[9px] text-orange-600 font-semibold mt-1">À RECMD.</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // === ECRAN SCAN ===
  const ScanScreen = () => (
    <div className="flex flex-col h-full" style={{ background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)' }}>
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <button onClick={() => setActiveScreen('home')} className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{
          background: 'rgba(255,255,255,0.08)',
          boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.1), inset -1px -1px 2px rgba(0,0,0,0.3)',
        }}>
          <X className="w-[18px] h-[18px] text-white" strokeWidth={1.75} />
        </button>
        <div className="text-center">
          <p className="text-[10px] tracking-[0.22em] uppercase text-white/50 font-semibold">Scan</p>
          <p className="text-[13px] text-white font-semibold mt-0.5">QR Code</p>
        </div>
        <div className="w-11" />
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        <div className="relative w-72 h-72">
          <div className="absolute top-0 left-0 w-14 h-14 border-t-[3px] border-l-[3px] border-orange-500 rounded-tl-3xl shadow-[0_0_20px_rgba(255,140,0,0.4)]"></div>
          <div className="absolute top-0 right-0 w-14 h-14 border-t-[3px] border-r-[3px] border-orange-500 rounded-tr-3xl shadow-[0_0_20px_rgba(255,140,0,0.4)]"></div>
          <div className="absolute bottom-0 left-0 w-14 h-14 border-b-[3px] border-l-[3px] border-orange-500 rounded-bl-3xl shadow-[0_0_20px_rgba(255,140,0,0.4)]"></div>
          <div className="absolute bottom-0 right-0 w-14 h-14 border-b-[3px] border-r-[3px] border-orange-500 rounded-br-3xl shadow-[0_0_20px_rgba(255,140,0,0.4)]"></div>
          <div className="absolute left-4 right-4 top-1/2 h-px bg-orange-500 shadow-[0_0_12px_rgba(255,140,0,0.8)]"></div>
        </div>
        <p className="absolute bottom-36 text-[12px] text-white/70 font-medium tracking-wide">Centrez le QR code dans le cadre</p>
      </div>

      <div className="px-6 pb-8 flex items-center justify-center gap-3">
        <button className="flex-1 py-3.5 rounded-2xl text-white text-[13px] font-semibold" style={{
          background: 'rgba(255,255,255,0.08)',
          boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.1)',
        }}>
          Saisie manuelle
        </button>
        <button className="flex-1 py-3.5 rounded-2xl text-white text-[13px] font-bold" style={orangeActive}>
          Continuer
        </button>
      </div>
    </div>
  );

  // === ECRAN MOUVEMENT ===
  const MovementScreen = () => (
    <div className="flex flex-col h-full bg-[#F4F2EE]">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setActiveScreen('home')} className="w-11 h-11 rounded-2xl flex items-center justify-center" style={neuRaisedSm}>
            <X className="w-[18px] h-[18px] text-neutral-800" strokeWidth={1.75} />
          </button>
          <p className="text-[11px] tracking-[0.22em] uppercase text-neutral-500 font-semibold">Nouveau mouvement</p>
          <div className="w-11" />
        </div>

        <div className="rounded-2xl p-4 mb-5 flex items-center gap-3" style={neuRaised}>
          <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={neuIconBg}>
            <Package className="w-6 h-6 text-neutral-700" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-neutral-900">Plaque BA13 hydrofuge</p>
            <p className="text-[10px] text-neutral-400 font-mono mt-1">CLO-BA13-HYD-001</p>
            <p className="text-[11px] text-neutral-500 mt-1.5">Stock actuel : <span className="font-bold text-neutral-900">24</span></p>
          </div>
        </div>

        <p className="text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-semibold mb-3">Type</p>
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          <button className="flex flex-col items-center gap-2 p-4 rounded-2xl text-white" style={orangeActive}>
            <ArrowDownToLine className="w-5 h-5" strokeWidth={2} />
            <span className="text-[11px] font-bold">Entrée</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 rounded-2xl" style={neuRaisedSm}>
            <ArrowUpFromLine className="w-5 h-5 text-neutral-700" strokeWidth={2} />
            <span className="text-[11px] font-semibold text-neutral-700">Sortie</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 rounded-2xl" style={neuRaisedSm}>
            <RotateCcw className="w-5 h-5 text-neutral-700" strokeWidth={2} />
            <span className="text-[11px] font-semibold text-neutral-700">Retour</span>
          </button>
        </div>

        <p className="text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-semibold mb-3">Quantité</p>
        <div className="rounded-2xl mb-5 flex items-center" style={neuPressed}>
          <button className="w-14 h-14 flex items-center justify-center text-neutral-600 text-2xl font-light">−</button>
          <input type="number" defaultValue="20" className="flex-1 bg-transparent text-center text-[26px] font-bold text-neutral-900 focus:outline-none tabular-nums" />
          <button className="w-14 h-14 flex items-center justify-center text-neutral-600 text-2xl font-light">+</button>
        </div>

        <p className="text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-semibold mb-3">Chantier</p>
        <button className="w-full rounded-2xl p-4 mb-5 flex items-center justify-between" style={neuRaisedSm}>
          <span className="text-[13px] text-neutral-500 font-medium">Sélectionner (optionnel)</span>
          <ChevronRight className="w-4 h-4 text-neutral-400" />
        </button>

        <p className="text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-semibold mb-3">Photo</p>
        <button className="w-full rounded-2xl p-5 mb-6 flex flex-col items-center gap-2" style={neuPressed}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={neuIconBg}>
            <Camera className="w-5 h-5 text-neutral-600" strokeWidth={1.75} />
          </div>
          <span className="text-[12px] text-neutral-500 font-semibold">Ajouter une photo</span>
        </button>
      </div>

      <div className="px-6 pb-6">
        <button className="w-full rounded-2xl py-4 text-white text-[14px] font-bold flex items-center justify-center gap-2" style={orangeActive}>
          <Check className="w-4 h-4" strokeWidth={2.5} />
          Valider le mouvement
        </button>
      </div>
    </div>
  );

  // === ECRAN ALERTES ===
  const AlertsScreen = () => (
    <div className="flex flex-col h-full bg-[#F4F2EE]">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[13px] text-neutral-500 font-medium">Stock</p>
            <h1 className="text-[32px] font-bold tracking-tight text-neutral-900 leading-tight">Alertes</h1>
          </div>
          <button className="w-12 h-12 rounded-2xl flex items-center justify-center" style={neuRaisedSm}>
            <Filter className="w-[16px] h-[16px] text-neutral-800" strokeWidth={1.75} />
          </button>
        </div>
        <div className="rounded-2xl p-4 flex items-center gap-3" style={neuRaisedSm}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white" style={orangeActive}>
            <AlertCircle className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="text-[13px] text-neutral-500 font-medium"><span className="font-bold text-neutral-900">7 articles</span> sous le seuil minimum</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">À recommander prochainement</p>
          </div>
        </div>
      </div>

      <div className="px-6 flex-1 space-y-2.5 pb-4">
        {[
          { name: 'Plaque BA13 standard 250', code: 'CLO-BA13-STD-001', stock: 3, min: 5, supplier: 'Point P' },
          { name: 'Vis TTPC 25mm boîte 500', code: 'CLO-VIS-TTP-001', stock: 1, min: 3, supplier: 'Point P' },
          { name: 'Gaine ICTA Ø20 rouleau 25m', code: 'ELE-GAI-020-001', stock: 2, min: 4, supplier: 'Rexel' },
          { name: 'Enduit Toupret 15kg', code: 'PEI-END-TOU-001', stock: 1, min: 2, supplier: 'Théodore' },
        ].map((a, i) => (
          <div key={i} className="rounded-2xl p-4" style={neuRaisedSm}>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={neuIconBg}>
                <AlertCircle className="w-[18px] h-[18px] text-orange-500" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-neutral-900 leading-tight">{a.name}</p>
                <p className="text-[10px] text-neutral-400 font-mono mt-1">{a.code}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3 px-1">
              <div>
                <p className="text-[9px] text-neutral-400 uppercase tracking-wider font-semibold">Stock</p>
                <p className="text-[18px] font-bold text-orange-500 tabular-nums leading-none mt-1">{a.stock}</p>
              </div>
              <div>
                <p className="text-[9px] text-neutral-400 uppercase tracking-wider font-semibold">Seuil</p>
                <p className="text-[18px] font-bold text-neutral-900 tabular-nums leading-none mt-1">{a.min}</p>
              </div>
              <div>
                <p className="text-[9px] text-neutral-400 uppercase tracking-wider font-semibold">Fourn.</p>
                <p className="text-[11px] font-bold text-neutral-700 mt-1.5">{a.supplier}</p>
              </div>
            </div>
            <button className="w-full rounded-xl py-3 text-white text-[12px] font-bold" style={orangeActive}>
              Marquer recommandé
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  // === ECRAN CHANTIERS ===
  const SitesScreen = () => (
    <div className="flex flex-col h-full bg-[#F4F2EE]">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[13px] text-neutral-500 font-medium">En cours</p>
            <h1 className="text-[32px] font-bold tracking-tight text-neutral-900 leading-tight">Chantiers</h1>
          </div>
          <button className="w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={orangeActive}>
            <Plus className="w-[18px] h-[18px]" strokeWidth={2.5} />
          </button>
        </div>
        <div className="rounded-2xl p-4 flex items-center gap-3" style={neuRaisedSm}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={neuIconBg}>
            <HardHat className="w-5 h-5 text-neutral-800" strokeWidth={1.75} />
          </div>
          <div className="flex-1">
            <p className="text-[13px] text-neutral-500 font-medium"><span className="font-bold text-neutral-900">12 chantiers</span> actifs</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Paris & Île-de-France</p>
          </div>
        </div>
      </div>

      <div className="px-6 flex-1 space-y-2.5 pb-4">
        {[
          { name: 'Haussmann 8e', address: '42 bd Haussmann, 75008', items: 87 },
          { name: 'Cassini Cour', address: '12 rue Cassini, 75014', items: 134 },
          { name: 'Trocadéro Loft', address: '5 av Kléber, 75016', items: 52 },
          { name: 'Bastille Duplex', address: '23 rue Roquette, 75011', items: 41 },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl p-4 flex items-center gap-3" style={neuRaisedSm}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={neuIconBg}>
              <HardHat className="w-5 h-5 text-neutral-800" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[14px] font-bold text-neutral-900 tracking-tight">{s.name}</p>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </div>
              <p className="text-[11px] text-neutral-500">{s.address}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <Package className="w-3 h-3 text-neutral-400" strokeWidth={2} />
                <span className="text-[11px] text-neutral-700 font-semibold tabular-nums">{s.items} articles affectés</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );

  // === NAVBAR ===
  const NavBar = () => {
    const items = [
      { id: 'home', icon: Home, label: 'Accueil' },
      { id: 'catalog', icon: Package, label: 'Catalogue' },
      { id: 'scan', icon: Scan, label: 'Scan', center: true },
      { id: 'alerts', icon: Bell, label: 'Alertes', badge: true },
      { id: 'sites', icon: HardHat, label: 'Chantiers' },
    ];
    return (
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-5 pt-2 pointer-events-none">
        <div className="rounded-[28px] px-2 py-2 flex items-center justify-around pointer-events-auto" style={neuRaised}>
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            if (item.center) {
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveScreen('movement')}
                  className="rounded-2xl flex items-center justify-center -mt-5 text-white"
                  style={{ ...orangeActive, width: 52, height: 52 }}
                >
                  <Icon className="w-5 h-5" strokeWidth={2.25} />
                </button>
              );
            }
            return (
              <button
                key={item.id}
                onClick={() => setActiveScreen(item.id)}
                className="flex flex-col items-center gap-1 px-3 py-1.5 relative"
              >
                <Icon
                  className={`w-[18px] h-[18px] ${isActive ? 'text-orange-500' : 'text-neutral-500'}`}
                  strokeWidth={isActive ? 2.25 : 1.75}
                />
                {item.badge && (
                  <span className="absolute top-0.5 right-2 w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                )}
                <span className={`text-[9px] font-semibold tracking-tight ${isActive ? 'text-orange-500' : 'text-neutral-500'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const screens = {
    home: <HomeScreen />,
    catalog: <CatalogScreen />,
    scan: <ScanScreen />,
    movement: <MovementScreen />,
    alerts: <AlertsScreen />,
    sites: <SitesScreen />,
  };

  const screenList = [
    { id: 'home', label: 'Accueil & dashboard', icon: LayoutGrid },
    { id: 'catalog', label: 'Catalogue articles', icon: Package },
    { id: 'movement', label: 'Saisie mouvement', icon: ArrowUpDown },
    { id: 'scan', label: 'Scanner QR code', icon: QrCode },
    { id: 'alerts', label: 'Alertes seuil', icon: Bell },
    { id: 'sites', label: 'Chantiers', icon: HardHat },
  ];

  return (
    <div className="min-h-screen w-full relative overflow-hidden p-8 lg:p-12" style={{
      background: '#F4F2EE',
      colorScheme: 'light',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif"
    }}>
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-50 pointer-events-none" style={{
        background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, transparent 65%)',
      }}></div>

      <div className="relative max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

        {/* LEFT - Presentation card */}
        <div className="lg:col-span-5">
          <div className="rounded-[40px] p-8 lg:p-10" style={neuRaised}>
            <div className="flex items-start justify-between mb-10">
              <Logo size={40} />
              <button className="w-12 h-12 rounded-2xl flex items-center justify-center relative" style={neuRaisedSm}>
                <Bell className="w-[18px] h-[18px] text-neutral-800" strokeWidth={1.75} />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-orange-500"></span>
              </button>
            </div>

            <h1 className="text-[40px] lg:text-[48px] font-bold tracking-tight text-neutral-900 leading-[1.05]">Mockup interactif</h1>
            <div className="flex items-center gap-1 mt-4 mb-6">
              <div className="h-1 w-12 rounded-full bg-orange-500"></div>
              <div className="h-1 w-1.5 rounded-full bg-orange-500"></div>
            </div>
            <p className="text-[14px] text-neutral-600 leading-relaxed">
              Cliquez sur les onglets de la navbar pour parcourir les écrans principaux. Le bouton central <span className="font-bold text-orange-500">Scan</span> ouvre la saisie d'un mouvement.
            </p>

            <p className="text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-semibold mt-8 mb-4">Écrans disponibles</p>
            <div className="space-y-2.5">
              {screenList.map((s) => {
                const Icon = s.icon;
                const isActive = activeScreen === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveScreen(s.id)}
                    className="w-full rounded-2xl p-3.5 flex items-center gap-3 transition-all duration-200"
                    style={isActive ? orangeActive : neuRaisedSm}
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={isActive ? {
                      background: 'rgba(255,255,255,0.25)',
                      boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.4), inset -1px -1px 2px rgba(0,0,0,0.1)',
                    } : neuIconBg}>
                      <Icon className={isActive ? 'text-white' : 'text-neutral-800'} style={{ width: 18, height: 18 }} strokeWidth={1.75} />
                    </div>
                    <span className={`flex-1 text-left text-[14px] font-bold tracking-tight ${isActive ? 'text-white' : 'text-neutral-900'}`}>
                      {s.label}
                    </span>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center" style={isActive ? {
                      background: 'rgba(255,255,255,0.2)',
                    } : {}}>
                      <ArrowRight className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-neutral-400'}`} strokeWidth={2.25} />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 rounded-2xl p-5" style={neuRaisedSm}>
              <p className="text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-semibold mb-4">Design System</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl" style={{ background: '#0A0A0A', boxShadow: '2px 2px 5px rgba(163,158,148,0.3), -2px -2px 5px rgba(255,255,255,0.9)' }}></div>
                <div className="w-10 h-10 rounded-xl" style={{ background: '#FAFAF9', boxShadow: '2px 2px 5px rgba(163,158,148,0.3), -2px -2px 5px rgba(255,255,255,0.9)' }}></div>
                <div className="w-10 h-10 rounded-xl" style={{ background: 'linear-gradient(135deg, #FFB570, #FF8C00)', boxShadow: '2px 2px 5px rgba(163,158,148,0.3), -2px -2px 5px rgba(255,255,255,0.9)' }}></div>
                <p className="text-[12px] text-neutral-600 ml-2 font-medium">Noir · Blanc · Orange</p>
              </div>
            </div>

            <div className="mt-8 pt-6 flex items-center justify-between" style={{ borderTop: '1px solid rgba(163,158,148,0.2)' }}>
              <p className="text-[10px] text-neutral-400 font-mono">INTERIA-LOG-MK-002</p>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Confidentiel</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT - App plein écran */}
        <div className="lg:col-span-7 flex justify-center lg:justify-end items-start lg:sticky lg:top-12">
          <div className="relative">
            <div className="hidden lg:flex absolute -top-4 -left-4 items-center gap-2 text-[10px] text-neutral-400 font-mono z-30">
              <span>{activeScreen.toUpperCase()}</span>
              <div className="w-12 h-px bg-neutral-300"></div>
            </div>

            <div className="absolute -inset-12 bg-gradient-to-br from-orange-200/30 via-transparent to-neutral-200/30 rounded-full blur-3xl"></div>

            <div className="relative w-[420px] h-[860px] rounded-[44px] overflow-hidden bg-[#F4F2EE]" style={{
              colorScheme: 'light',
              boxShadow: '12px 12px 30px rgba(163, 158, 148, 0.45), -12px -12px 30px rgba(255, 255, 255, 0.95)',
            }}>
              <div className="pt-6 pb-28 h-full overflow-y-auto">
                {screens[activeScreen]}
              </div>
              <NavBar />
            </div>

            <div className="hidden lg:flex absolute -bottom-4 -right-4 items-center gap-2 text-[10px] text-neutral-400 font-mono z-30">
              <div className="w-12 h-px bg-neutral-300"></div>
              <span>Mobile preview</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}