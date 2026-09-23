import { Component, type ReactNode } from "react";
export class PageBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <section className="card" role="alert">
        <h1>Bu bölüm şu anda açılamadı.</h1>
        <p>
          Gezinti ve diğer kayıt bölümleri kullanılabilir. Kaydedilmiş verilerin
          değiştirilmedi.
        </p>
        <button onClick={() => this.setState({ failed: false })}>
          Bölümü yeniden aç
        </button>
        <a className="link-button secondary" href="#system">
          Kayıt durumunu göster
        </a>
      </section>
    ) : (
      this.props.children
    );
  }
}
