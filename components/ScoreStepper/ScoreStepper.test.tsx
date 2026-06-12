import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ScoreStepper } from "./ScoreStepper"

describe("ScoreStepper", () => {
  it("erhöht und verringert um 1", () => {
    const onChange = vi.fn()
    render(<ScoreStepper value={2} ariaLabel="Tore Schweiz" onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: "Tore Schweiz +1" }))
    expect(onChange).toHaveBeenLastCalledWith(3)
    fireEvent.click(screen.getByRole("button", { name: "Tore Schweiz −1" }))
    expect(onChange).toHaveBeenLastCalledWith(1)
  })

  it("startet ohne Tipp bei +1 = 1 und sperrt −1", () => {
    const onChange = vi.fn()
    render(<ScoreStepper value={null} ariaLabel="Tore Schweiz" onChange={onChange} />)
    expect(screen.getByRole("button", { name: "Tore Schweiz −1" })).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: "Tore Schweiz +1" }))
    expect(onChange).toHaveBeenLastCalledWith(1)
  })

  it("sperrt +1 am Maximum und klemmt Tippeingaben auf 0–20", () => {
    const onChange = vi.fn()
    render(<ScoreStepper value={20} ariaLabel="Tore Schweiz" onChange={onChange} />)
    expect(screen.getByRole("button", { name: "Tore Schweiz +1" })).toBeDisabled()
    fireEvent.change(screen.getByRole("spinbutton", { name: "Tore Schweiz" }), { target: { value: "25" } })
    expect(onChange).toHaveBeenLastCalledWith(20)
  })

  it("sperrt alles bei disabled", () => {
    render(<ScoreStepper value={1} ariaLabel="Tore Schweiz" disabled onChange={() => {}} />)
    expect(screen.getByRole("spinbutton", { name: "Tore Schweiz" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Tore Schweiz +1" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Tore Schweiz −1" })).toBeDisabled()
  })
})
