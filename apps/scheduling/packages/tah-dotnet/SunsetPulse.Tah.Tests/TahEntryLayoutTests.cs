using SunsetPulse.Tah;
using Xunit;

namespace SunsetPulse.Tah.Tests;

public sealed class TahEntryLayoutTests
{
    private static readonly string GoldenEntryHex = File.ReadAllText(
        Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "tah-spec", "golden", "tah-entry-v1.hex")
    ).Trim();

    [Fact]
    public void PacksThe80ByteEntryContract()
    {
        var packed = TahEntryLayout.PackEntry(
            new TahEntry(
                Tag: 0x42,
                Offset: 0x0102030405060708,
                Length: 0x11223344,
                Meta: 0x55667788,
                Spec: new TahSpecV1(3, 1, 0x0A0B, TahEntryLayout.Utf8("hello tah"))
            )
        );

        Assert.Equal(TahEntryLayout.EntrySize, packed.Length);
        Assert.Equal(GoldenEntryHex, TahEntryLayout.BytesToHex(packed));
    }

    [Fact]
    public void RoundTripsEntryFields()
    {
        var decoded = TahEntryLayout.UnpackEntry(TahEntryLayout.HexToBytes(GoldenEntryHex));

        Assert.Equal(0x42, decoded.Tag);
        Assert.Equal(new byte[7], decoded.Pad);
        Assert.Equal(0x0102030405060708UL, decoded.Offset);
        Assert.Equal(0x11223344U, decoded.Length);
        Assert.Equal(0x55667788U, decoded.Meta);
        Assert.Equal(3, decoded.Spec.Kind);
        Assert.Equal(1, decoded.Spec.Version);
        Assert.Equal(0x0A0B, decoded.Spec.Flags);
        Assert.Equal(TahEntryLayout.Utf8("hello tah"), decoded.Spec.Payload![..9]);
        Assert.Equal(decoded.RawSpec, TahEntryLayout.PackSpecV1(decoded.Spec));
    }

    [Fact]
    public void RejectsUndersizedRawSpecBytes()
    {
        var error = Assert.Throws<ArgumentException>(() => TahEntryLayout.UnpackSpecV1(new byte[55]));
        Assert.Contains("exactly 56 bytes", error.Message);
    }
}
