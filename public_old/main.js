// const
const size = 45
const columns = 15
const rows = 21
const PLAYER1 = '1'
const PLAYER2 = '2'
const tiles = {}
const tiles_list = []
const units = {}

// state
let turn = PLAYER2
let turn_attacks = []
let turn_walks = []
let unit_id_index = 0
let unit_selected
let unit_tiles_rangeables = []
let unit_dragging
let unit_range_selected

const game = new Game({ columns, rows })
game.addPlayer({ player_id: PLAYER1, team_id: '1' })
game.addPlayer({ player_id: PLAYER2, team_id: '2' })
game.on(EVENT.ADD_UNIT, ({ unit_id, life }) => {
    units[unit_id].changeLife(life)
})
game.on(EVENT.MOVE, ({ unit_id, tile_id }) => {
    units[unit_id].changePosition(tile_id)
})
game.on(EVENT.WALK, ({ unit_id, path }) => {
    const tile_id = path[path.length - 1]
    units[unit_id].changePosition(tile_id)
})
game.on(EVENT.ATTACK, ({ unit_id, unit_id_enemy, life }) => {
    units[unit_id_enemy].changeLife(life)
})
game.on(EVENT.DIE, ({ unit_id }) => {
    units[unit_id].die()
    delete units[unit_id]
})

function changeTurn(player) {
    clearTiles()
    unit_selected = undefined
    turn_walks = []
    turn_attacks = []
    turn = player
    if (player === PLAYER1) {
        document.getElementById('button_turn1').disabled = true
        document.getElementById('button_turn2').disabled = false
    } else {
        document.getElementById('button_turn1').disabled = false
        document.getElementById('button_turn2').disabled = true
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

function getNextTileId(inverted = false) {
    for (let i = 0; i < tiles_list.length; ++i) {
        const index = inverted ? tiles_list.length - i - 1 : i
        if (getUnitByTile(tiles_list[index]) === undefined)
            return tiles_list[index]
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
            const { walkables, attackables, range } = game.getActions({
                unit_id
            })

            unit_range_selected = range
            unit_tiles_rangeables = walkables.slice(0)
            unit_tiles_rangeables.push(tile_id)

            game.board.getTilesByRange({ tile_id, range }).forEach(tile_id => {
                // if (getUnitByTile(tile_id) === undefined)
                setTileRange(tile_id)
            })

            if (
                !turn_attacks.includes(unit_id) &&
                !turn_walks.includes(unit_id)
            ) {
                walkables.forEach(tile_id => setTileWalkable(tile_id))
            }

            if (!turn_attacks.includes(unit_id)) {
                attackables.forEach(({ tile_id }) => setTileAttackable(tile_id))
            }
        }

        // ATTACK
        else if (
            unit_selected !== undefined &&
            !turn_attacks.includes(unit_selected)
        ) {
            try {
                game.attack({ unit_id: unit_selected, tile_id })
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
            game.walk({ unit_id, tile_id })
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
}
function onMouseOver(tile_id) {
    if (unit_dragging !== undefined && getUnitByTile(tile_id) === undefined) {
        clearTiles()
        game.move({ unit_id: unit_dragging, tile_id })
        // units[unit_dragging].changePosition(tile_id)
    } else if (unit_selected !== undefined) {
        clearTilesRange()
        const tile_id_origin =
            unit_tiles_rangeables.includes(tile_id) &&
            !turn_attacks.includes(unit_selected) &&
            !turn_walks.includes(unit_selected)
                ? tile_id
                : units[unit_selected].tile_id

        game.board
            .getTilesByRange({
                tile_id: tile_id_origin,
                range: unit_range_selected
            })
            .forEach(tile_id => {
                const className = tiles[tile_id].className
                if (className === '') {
                    setTileRange(tile_id)
                }
            })
    }
}
function onMouseUp(tile_id, e) {
    unit_dragging = undefined
}

function getUnitByTile(tile_id) {
    for (const unit_id in units) {
        if (units[unit_id].tile_id === tile_id) return unit_id
    }
}

function addUnit(type, player_id) {
    clearTiles()
    unit_selected = undefined
    player_id = player_id.toString()
    const tile_id = getNextTileId(player_id === PLAYER2)
    const unit_id = (unit_id_index++).toString()
    const unit_type = type.toUpperCase()
    const unit = createUnit({ img: `img/${type}${player_id}.png` })
    unit.player_id = player_id
    units[unit_id] = unit
    game.addUnit({ player_id, unit_id, unit_type, tile_id })
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
        changeLife: l => {
            life.innerHTML = l
        },
        die: () => {
            document.getElementById('grid').removeChild(div)
        }
    }
    return object
}
