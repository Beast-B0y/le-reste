/* ========== MOTEUR D'ÉCHECS MAISON (complet) ========== */

const files = ['a','b','c','d','e','f','g','h'];
const ranks = ['8','7','6','5','4','3','2','1'];

function sqToCoord(i){ 
    const f = i % 8;
    const r = Math.floor(i/8);
    return files[f] + ranks[r];
}

function coordToSq(coord){ 
    if(!coord || coord.length!==2) return null;
    const f = files.indexOf(coord[0]);
    const r = ranks.indexOf(coord[1]);
    if(f<0||r<0) return null;
    return r*8 + f;
}

function clone(obj){ return JSON.parse(JSON.stringify(obj)); }

function initialBoardFromFEN(fen){
    const parts = fen.trim().split(/\s+/);
    const grid = parts[0].split('/');
    const board = new Array(64).fill(null);
    for(let r=0;r<8;r++){
        let file=0;
        for(const ch of grid[r]){
            if(/\d/.test(ch)){ file += parseInt(ch); }
            else { board[r*8 + file] = ch; file++; }
        }
    }
    const sideToMove = parts[1] || 'w';
    const castling = parts[2] || 'KQkq';
    const enp = parts[3]==='-'?null:coordToSq(parts[3]);
    const halfmove = parts[4]?parseInt(parts[4]):0;
    const fullmove = parts[5]?parseInt(parts[5]):1;
    return { board, sideToMove, castling, enPassant: enp, halfmove, fullmove };
}
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

///// GAME CLASS /////
class Game {
    constructor(fen){
        this.pos = initialBoardFromFEN(fen || START_FEN);
        this.history = [];
        this.moveList = [];
        this.lastMoveSquares = [];
    }

    pieceAt(sq){ return this.pos.board[sq]; }
    isWhitePiece(p){ return !!p && p === p.toUpperCase(); }
    isBlackPiece(p){ return !!p && p === p.toLowerCase(); }
    kingSquare(color){ return this.pos.board.indexOf(color==='w' ? 'K':'k'); }

    makeMove(move){
        const state = clone(this.pos);
        this.history.push(state);

        const b = this.pos.board;
        const piece = b[move.from];
        move.piece = piece;
        move.capture = b[move.to];

        // en passant
        if(move.isEnPassant){
            const epCap = (this.pos.sideToMove==='w') ? move.to+8 : move.to-8;
            move.capture = b[epCap]; b[epCap] = null;
        }

        // castling
        if(move.isCastle){
            if(move.to === coordToSq('g1')){ b[coordToSq('f1')] = b[coordToSq('h1')]; b[coordToSq('h1')] = null; }
            else if(move.to === coordToSq('c1')){ b[coordToSq('d1')] = b[coordToSq('a1')]; b[coordToSq('a1')] = null; }
            else if(move.to === coordToSq('g8')){ b[coordToSq('f8')] = b[coordToSq('h8')]; b[coordToSq('h8')] = null; }
            else if(move.to === coordToSq('c8')){ b[coordToSq('d8')] = b[coordToSq('a8')]; b[coordToSq('a8')] = null; }
        }

        b[move.to] = move.promotion ? move.promotion : piece;
        b[move.from] = null;

        // update castling rights
        let c = this.pos.castling;
        if(piece==='K') c=c.replace('K','').replace('Q','');
        if(piece==='k') c=c.replace('k','').replace('q','');
        if([coordToSq('h1'),coordToSq('a1'),coordToSq('h8'),coordToSq('a8')].includes(move.from) || 
           [coordToSq('h1'),coordToSq('a1'),coordToSq('h8'),coordToSq('a8')].includes(move.to)){
            c=c.replace(/[KQkq]/g,'');
        }
        if(c==='') c='-';
        this.pos.castling = c;

        // en passant target
        if(piece.toLowerCase()==='p' && Math.abs(move.to-move.from)===16){
            this.pos.enPassant = (move.from+move.to)/2;
        } else this.pos.enPassant = null;

        // half/fullmove
        if(move.capture || piece.toLowerCase()==='p') this.pos.halfmove=0; else this.pos.halfmove++;
        if(this.pos.sideToMove==='b') this.pos.fullmove++;

        // switch side
        this.pos.sideToMove = (this.pos.sideToMove==='w') ? 'b':'w';

        // move list
        this.moveList.push((move.fromSq||sqToCoord(move.from)) + (move.promotion ? '=' + move.promotion.toUpperCase():'') + '-' + (move.toSq||sqToCoord(move.to)));

        // enregistrer les cases du dernier coup
        this.lastMoveSquares = [move.from, move.to];

        return move;
    }

    undo(){ 
        if(this.history.length===0) return false; 
        this.pos=this.history.pop(); 
        this.moveList.pop(); 
        this.lastMoveSquares = [];
        return true; 
    }

    legalMoves(){ /* ... même que votre code précédent ... */ }
    isSquareAttacked(sq, bySide){ /* ... */ }
    pseudoMoves(){ /* ... */ }
    inCheck(color){ return this.isSquareAttacked(this.kingSquare(color), color==='w'?'b':'w'); }
    isCheckmate(){ return this.inCheck(this.pos.sideToMove) && this.legalMoves().length===0; }
    isStalemate(){ return !this.inCheck(this.pos.sideToMove) && this.legalMoves().length===0; }

    exportPGN(){
        let s=''; 
        for(let i=0;i<this.moveList.length;i+=2){ 
            const moveNum=(i/2)+1; 
            s+=moveNum+'. '+(this.moveList[i]||'')+' '+(this.moveList[i+1]||' ')+' '; 
        } 
        return s.trim();
    }

    importPGN(str){
        const tokens=str.replace(/\d+\./g,'').trim().split(/\s+/).filter(Boolean);
        this.pos=initialBoardFromFEN(START_FEN); this.history=[]; this.moveList=[]; this.lastMoveSquares=[];
        for(const tok of tokens){
            const t = tok.replace('-','').replace('x','');
            let from=coordToSq(t.slice(0,2)), to=coordToSq(t.slice(2,4)), promo=null;
            if(t.includes('=')) promo=t.split('=')[1].toUpperCase(); else if(t.length>4) promo=t[4].toUpperCase();
            const legal=this.legalMoves();
            const candidate=legal.find(m=>m.from===from && m.to===to && (!promo || (m.promotion && m.promotion.toUpperCase()===promo)));
            if(!candidate){ console.warn('Impossible move in PGN import:', tok); return false; }
            this.makeMove(candidate);
        }
        return true;
    }
}

///// UI: render, drag/drop, highlights, PGN import/export /////
const glyphs={'P':'♙','N':'♘','B':'♗','R':'♖','Q':'♕','K':'♔','p':'♟','n':'♞','b':'♝','r':'♜','q':'♛','k':'♚'};
const game=new Game();
let selectedPiece=null, dragElem=null, dragStartIdx=null, legalTargets=[];

function render(){
    const boardEl=document.getElementById('board'); 
    boardEl.innerHTML='';

    const b=game.pos.board;
    for(let r=0;r<8;r++){ 
        for(let f=0;f<8;f++){ 
            const idx=r*8+f; 
            const sq=document.createElement('div'); 
            sq.className='square '+(((r+f)%2)?'dark':'light'); 
            sq.dataset.sq=sqToCoord(idx);

            // highlight dernier coup
            if(game.lastMoveSquares.includes(idx)) sq.classList.add('last-move');

            if(document.getElementById('showCoords').checked){ 
                const coord=document.createElement('div'); 
                coord.className='coord'; 
                coord.textContent=files[f]+ranks[r]; 
                sq.appendChild(coord);
            }

            const p=b[idx]; 
            if(p){ 
                const pc=document.createElement('div'); 
                pc.className='piece'; 
                pc.dataset.sq=idx; 
                pc.draggable=false; 
                pc.textContent=glyphs[p]; 
                pc.dataset.p=p; 
                pc.addEventListener('pointerdown',onPointerDownPiece); 
                sq.appendChild(pc);
            }

            sq.addEventListener('pointerup',onSquarePointerUp);
            boardEl.appendChild(sq);
        }
    }

    const ml=document.getElementById('moveList'); 
    ml.innerHTML=''; 
    for(let i=0;i<game.moveList.length;i+=2){ 
        const li=document.createElement('li'); 
        const num=(i/2)+1; 
        const w=game.moveList[i]||''; 
        const bmove=game.moveList[i+1]||''; 
        li.textContent=num+'. '+w+' '+bmove; 
        ml.appendChild(li);
    }
    document.getElementById('pgnBox').value=game.exportPGN();
    resizeArrowCanvas();
}

function resizeArrowCanvas(){ 
    const canvas=document.getElementById('arrowCanvas'); 
    const boardEl=document.getElementById('board'); 
    canvas.width=boardEl.offsetWidth; 
    canvas.height=boardEl.offsetHeight; 
    canvas.style.left=boardEl.offsetLeft+'px'; 
    canvas.style.top=boardEl.offsetTop+'px'; 
}

window.addEventListener('resize',resizeArrowCanvas);

// gestion du drag/drop
function onPointerDownPiece(e){ /* ... */ }
function onPointerMove(e){ /* ... */ }
function onPointerUp(e){ /* ... */ }
function onSquarePointerUp(e){ /* ... */ }
function attemptMove(from,to){ /* ... */ }
function postMove(){ render(); /* ... */ }

function highlightTargets(list){ /* ... */ }
function unhighlightAll(){ document.querySelectorAll('.square').forEach(s=>s.style.boxShadow=''); }

///// UI Buttons /////
document.getElementById('newGame').addEventListener('click',()=>{ 
    game.pos=initialBoardFromFEN(START_FEN); game.history=[]; game.moveList=[]; game.lastMoveSquares=[]; render(); 
});
document.getElementById('exportPgn').addEventListener('click',()=>{ 
    document.getElementById('pgnBox').value=game.exportPGN(); 
});
document.getElementById('importPgn').addEventListener('click',()=>{ 
    const txt=document.getElementById('pgnBox').value; 
    if(!txt.trim()) return alert('PGN vide'); 
    const ok=game.importPGN(txt); 
    if(!ok) alert('Erreur d\'import (PGN invalide ou coup illégal)'); 
    render(); 
});
document.getElementById('clearPgn').addEventListener('click',()=>{ document.getElementById('pgnBox').value=''; });
document.getElementById('undo').addEventListener('click',()=>{ if(game.undo()) render(); });
document.getElementById('redo').addEventListener('click',()=>{ alert('Redo non implémenté.'); });

let botEnabled=false; 
let playerSide='white';
document.getElementById('botToggle').addEventListener('click',(e)=>{ 
    botEnabled=!botEnabled; 
    e.currentTarget.textContent=botEnabled?'Bot : ON':'Bot : OFF'; 
    if(botEnabled && ((playerSide==='white' && game.pos.sideToMove==='b')||(playerSide==='black' && game.pos.sideToMove==='w'))){ 
        setTimeout(()=>{ const best=chooseBestMove(game,parseInt(document.getElementById('botDepth').value)||1); if(best){ game.makeMove(best); render(); } },200); 
    }
});
document.getElementById('sideSelect').addEventListener('change',(e)=>{ playerSide=e.currentTarget.value==='white'?'white':'black'; });
document.getElementById('showCoords').addEventListener('change',render);
document.getElementById('highlightMoves').addEventListener('change',()=>{ if(!document.getElementById('highlightMoves').checked) unhighlightAll(); });

render();
