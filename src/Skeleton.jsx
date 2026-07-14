function Block({ width = '100%', height = '14px', radius = '6px', style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius, background: 'var(--app-border)',
      animation: 'skeletonPulse 1.4s ease-in-out infinite', ...style,
    }} />
  )
}

function FeedSkeleton() {
  return (
    <div>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ borderBottom: '8px solid var(--app-border)' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 16px' }}>
            <Block width="36px" height="36px" radius="50%" />
            <div style={{ flex: 1 }}>
              <Block width="120px" height="12px" />
              <Block width="80px" height="10px" style={{ marginTop: '8px' }} />
            </div>
          </div>
          <Block width="100%" height="280px" radius="0" />
          <div style={{ padding: '12px 16px' }}>
            <Block width="90%" height="12px" />
            <Block width="60%" height="12px" style={{ marginTop: '8px' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function NewsSkeleton() {
  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ borderRadius: '22px', border: '1px solid var(--app-border)', overflow: 'hidden' }}>
          <Block width="100%" height="180px" radius="0" />
          <div style={{ padding: '16px' }}>
            <Block width="70px" height="18px" radius="999px" />
            <Block width="80%" height="16px" style={{ marginTop: '10px' }} />
            <Block width="100%" height="12px" style={{ marginTop: '10px' }} />
            <Block width="90%" height="12px" style={{ marginTop: '6px' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function PolymartSkeleton() {
  return (
    <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ borderRadius: '16px', border: '1px solid var(--app-border)', overflow: 'hidden' }}>
          <Block width="100%" height="120px" radius="0" />
          <div style={{ padding: '10px' }}>
            <Block width="50px" height="15px" />
            <Block width="90%" height="12px" style={{ marginTop: '8px' }} />
            <Block width="40%" height="10px" style={{ marginTop: '8px' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--app-border)', padding: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Block width="82px" height="82px" radius="50%" />
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ textAlign: 'center' }}>
                <Block width="24px" height="17px" style={{ margin: '0 auto' }} />
                <Block width="36px" height="10px" style={{ margin: '6px auto 0' }} />
              </div>
            ))}
          </div>
        </div>
        <Block width="140px" height="17px" style={{ marginTop: '18px' }} />
        <Block width="100px" height="12px" style={{ marginTop: '8px' }} />
      </div>
      <div style={{ background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--app-border)', padding: '18px', marginTop: '14px' }}>
        <Block width="100%" height="44px" style={{ marginBottom: '10px' }} />
        <Block width="100%" height="44px" style={{ marginBottom: '10px' }} />
        <Block width="100%" height="70px" />
      </div>
    </div>
  )
}

export { Block, FeedSkeleton, NewsSkeleton, PolymartSkeleton, ProfileSkeleton }
