// const
const size = 45
const columns = 15
const rows = 21
const PLAYER1 = '1'
const PLAYER2 = '2'
const PLAYER3 = '3'
const PLAYER4 = '4'
const tiles = {}
const tiles_list = []
const units = {}
const flags = {}

// state
let turn = PLAYER1
let turn_attacks = []
let turn_walks = []
let flag_id_index = 0
let unit_id_index = 0
let unit_selected
let unit_tiles_rangeables = []
let unit_range_selected
let unit_dragging
let flag_dragging

const { Game, EVENT, Elements, UNIT_TYPE } = Conkis
const game = new Game({ columns, rows })
game.playerAdd({ player_id: PLAYER1, team_id: '1' })
game.playerAdd({ player_id: PLAYER3, team_id: '1' })
game.playerAdd({ player_id: PLAYER2, team_id: '2' })
game.playerAdd({ player_id: PLAYER4, team_id: '2' })
game.on(EVENT.UNIT_ADD, ({ unit_id, life, range }) => {
    units[unit_id].range = range
    units[unit_id].changeLife(life)
})
game.on(EVENT.FLAG_TILE, ({ flag_id, tile_id }) => {
    flags[flag_id].changePosition(tile_id)
})
game.on(EVENT.UNIT_TILE, ({ unit_id, tile_id }) => {
    units[unit_id].changePosition(tile_id)
})
game.on(EVENT.UNIT_SELECT, ({ unit_id, walkables, attackables }) => {
    const { range, tile_id } = units[unit_id]
    unit_tiles_rangeables = walkables.slice(0)
    unit_tiles_rangeables.push(tile_id)
    game.getTilesByRange({ tile_id, range }).forEach(tile_id => {
        // if (getUnitByTile(tile_id) === undefined)
        setTileRange(tile_id)
    })
    if (!turn_attacks.includes(unit_id) && !turn_walks.includes(unit_id)) {
        walkables.forEach(tile_id => setTileWalkable(tile_id))
    }
    if (!turn_attacks.includes(unit_id)) {
        attackables.forEach(({ tile_id }) => setTileAttackable(tile_id))
    }
})
game.on(EVENT.UNIT_WALK, ({ unit_id, path }) => {
    units[unit_id].changePath(path)
})
// game.on(EVENT.UNIT, ({ unit_id, path }) => {
//     const tile_id = path[path.length - 1]
//     units[unit_id].changePosition(tile_id)
// })
// game.on(EVENT.ATTACK, ({ unit_id, unit_id_enemy, life }) => {
//     units[unit_id_enemy].changeLife(life)
// })
// game.on(EVENT.DIE, ({ unit_id }) => {
//     units[unit_id].die()
//     delete units[unit_id]
// })

function changeTurn(player_id) {
    clearTiles()
    unit_selected = undefined
    turn_walks = []
    turn_attacks = []
    turn = player_id
    for (let i = 1; i <= 4; i++) {
        document.getElementById('button_turn' + i).disabled =
            player_id === String(i)
    }
}

function onClick(tile_id) {
    clearTiles()
    const unit_id = getUnitByTile(tile_id)
    if (unit_id !== undefined) {
        const unit = units[unit_id]

        // SELECT
        if (unit.player_id === turn) {
            unit_selected = unit_id
            setTileSelected(tile_id)
            game.unitSelect({ unit_id })
        }

        // ATTACK
        else if (
            unit_selected !== undefined &&
            !turn_attacks.includes(unit_selected)
        ) {
            try {
                game.unitAttack({ unit_id: unit_selected, tile_id })
                turn_attacks.push(unit_selected)
            } catch (e) {}
            unit_selected = undefined
        }
    }

    // WALK
    else if (
        unit_selected !== undefined &&
        !turn_attacks.includes(unit_selected) &&
        !turn_walks.includes(unit_selected)
    ) {
        try {
            const unit_id = unit_selected
            game.unitWalk({ unit_id, tile_id })
            turn_walks.push(unit_id)
            unit_selected = undefined
            onClick(units[unit_id].tile_id)
        } catch (e) {
            unit_selected = undefined
        }
    } else {
        unit_selected = undefined
    }
}

function onMouseDown(tile_id) {
    unit_dragging = getUnitByTile(tile_id)
    flag_dragging = getFlagByTile(tile_id)
}
function onMouseOver(tile_id) {
    const organizing = document.getElementById('organizing').checked
    if (
        organizing &&
        unit_dragging !== undefined &&
        getUnitByTile(tile_id) === undefined
    ) {
        clearTiles()
        game.unitTile({ unit_id: unit_dragging, tile_id })
    } else if (
        organizing &&
        flag_dragging !== undefined &&
        getFlagByTile(tile_id) === undefined
    ) {
        clearTiles()
        game.flagTile({ flag_id: flag_dragging, tile_id })
    } else if (unit_selected !== undefined) {
        // clearTilesRange()
        // const unit = units[unit_selected]
        // const tile_id_origin =
        //     unit_tiles_rangeables.includes(tile_id) &&
        //     !turn_attacks.includes(unit_selected) &&
        //     !turn_walks.includes(unit_selected)
        //         ? tile_id
        //         : unit.tile_id
        // game.getTilesByRange({
        //     tile_id: tile_id_origin,
        //     range: unit.range
        // }).forEach(tile_id => {
        //     const className = tiles[tile_id].className
        //     if (className === '') {
        //         setTileRange(tile_id)
        //     }
        // })
    }
}
function onMouseUp(tile_id, e) {
    unit_dragging = undefined
    flag_dragging = undefined
}

function getUnitByTile(tile_id) {
    for (const unit_id in units) {
        if (units[unit_id].tile_id === tile_id) return unit_id
    }
}

function getFlagByTile(tile_id) {
    for (const flag_id in flags) {
        if (flags[flag_id].tile_id === tile_id) return flag_id
    }
}

function unitAdd(type, player_id) {
    clearTiles()
    unit_selected = undefined
    player_id = player_id.toString()
    const tile_id = getNextTileId(
        player_id === PLAYER2 || player_id === PLAYER4
    )
    const unit_id = (unit_id_index++).toString()
    const unit_type = type.toUpperCase()
    const unit = createUnit({ img: `img/${type}${player_id}.png` })
    unit.player_id = player_id
    units[unit_id] = unit
    game.unitAdd(createUnitObject({ unit_id, unit_type }))
    game.unitPlayer({ unit_id, player_id })
    game.unitTile({ unit_id, tile_id })
}

function flagAdd() {
    clearTiles()
    const tile_id =
        tiles_list[Math.round(tiles_list.length / 2) + flag_id_index]
    const flag_id = (flag_id_index++).toString()
    flags[flag_id] = createFlag()
    game.flagAdd({ flag_id })
    game.flagTile({ flag_id, tile_id })
}

function createUnit({ img }) {
    const div = document.createElement('div')
    div.className = 'unit'
    div.style.width = `${size}px`
    div.style.height = `${size}px`
    div.style.background = `url('${img}') center center / 100% 100%`
    const life = document.createElement('span')
    div.appendChild(life)
    document.getElementById('grid').appendChild(div)
    const object = {
        changePosition: tile_id => {
            const { x, y } = tiles[tile_id]
            object.tile_id = tile_id
            div.style.top = `${size * x + x}px`
            div.style.left = `${size * y + y}px`
        },
        changePath: path => {
            const { x, y } = tiles[tile_id]
            object.tile_id = tile_id
            div.style.top = `${size * x + x}px`
            div.style.left = `${size * y + y}px`
        },
        changeLife: l => {
            life.innerHTML = l
        },
        die: () => {
            document.getElementById('grid').removeChild(div)
        }
    }
    return object
}

function createFlag() {
    const div = document.createElement('div')
    div.className = 'flag'
    div.style.width = `${size}px`
    div.style.height = `${size}px`
    div.style.background = `url('img/flag.png') center center / 50% 50% no-repeat`
    document.getElementById('grid').appendChild(div)
    const object = {
        changePosition: tile_id => {
            const { x, y } = tiles[tile_id]
            object.tile_id = tile_id
            div.style.top = `${size * x + x}px`
            div.style.left = `${size * y + y}px`
        },
        changePlayer: player_id => {
            div.style.background_image = `flag${player_id}.png`
        }
    }
    return object
}

function createUnitObject({ unit_type, unit_id }) {
    let unit
    switch (unit_type) {
        case UNIT_TYPE.TOWER:
            unit = Elements.Tower(unit_id)
            break
        case UNIT_TYPE.CATAPULT:
            unit = Elements.Catapult(unit_id)
            break
        case UNIT_TYPE.HORSE:
            unit = Elements.Horse(unit_id)
            break
        case UNIT_TYPE.SPEARMAN:
            unit = Elements.Spearman(unit_id)
            break
        case UNIT_TYPE.AXEMAN:
            unit = Elements.Axeman(unit_id)
            break
        case UNIT_TYPE.ARCHER:
            unit = Elements.Archer(unit_id)
            break
        case UNIT_TYPE.SLINGER:
            unit = Elements.Slinger(unit_id)
            break
        case UNIT_TYPE.HORSEARCHER:
            unit = Elements.HorseArcher(unit_id)
            break
    }

    return unit
}

function getNextTileId(inverted = false) {
    for (let i = 0; i < tiles_list.length; ++i) {
        const index = inverted ? tiles_list.length - i - 1 : i
        if (getUnitByTile(tiles_list[index]) === undefined)
            return tiles_list[index]
    }
}

function createGrid() {
    for (let x = 0; x < columns; ++x) {
        for (let y = 0; y < rows; ++y) {
            const id = `${x}.${y}`
            const div = document.createElement('div')
            const div2 = document.createElement('div')
            div.x = x
            div.y = y
            document.getElementById('grid').appendChild(div)
            div.appendChild(div2)

            div.onclick = e => onClick(id, e)
            div.onmousedown = e => onMouseDown(id, e)
            div.onmouseup = e => onMouseUp(id, e)
            div.onmouseover = e => onMouseOver(id, e)
            div.style.width = `${size}px`
            div.style.height = `${size}px`
            div.style.top = `${size * x + x}px`
            div.style.left = `${size * y + y}px`

            tiles_list.push(id)
            tiles[id] = div
        }
    }
}
createGrid()

function setTileWalkable(tile_id) {
    tiles[tile_id].className = 'walkable'
}
function setTileAttackable(tile_id) {
    tiles[tile_id].className = 'attackable'
}
function setTileRange(tile_id) {
    tiles[tile_id].className = 'range'
}
function setTileSelected(tile_id) {
    tiles[tile_id].className = 'selected'
}
function clearTiles() {
    for (const tile_id in tiles) {
        tiles[tile_id].className = ''
    }
}
function clearTilesRange() {
    for (const tile_id in tiles) {
        if (tiles[tile_id].className === 'range') tiles[tile_id].className = ''
    }
}
